import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ─── Shared auth guard ─────────────────────────────────────────────────────────

async function requireActiveSession() {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") return null;
  return session;
}

// ─── Validation schema ─────────────────────────────────────────────────────────

const createItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255),
  type: z.enum(["PLACE", "FOOD"], { error: "Type must be PLACE or FOOD" }),
  tripId: z.string().cuid("tripId must be a valid CUID"),
  description: z.string().trim().max(1000).optional(),
  location: z.string().trim().max(500).optional(),
  locationLat: z.number().min(-90).max(90).optional().nullable(),
  locationLng: z.number().min(-180).max(180).optional().nullable(),
  address: z.string().trim().max(500).optional(),
  externalUrl: z
    .string()
    .trim()
    .url("externalUrl must be a valid URL")
    .optional()
    .or(z.literal("")),
  imageUrl: z
    .string()
    .url("imageUrl must be a valid URL")
    .refine(
      (url) => url.startsWith("https://res.cloudinary.com/"),
      "imageUrl must be a Cloudinary URL",
    )
    .optional(),
});

// ─── Shared select shape ───────────────────────────────────────────────────────

const itemSelect = {
  id: true,
  title: true,
  type: true,
  status: true,
  description: true,
  location: true,
  locationLat: true,
  locationLng: true,
  address: true,
  externalUrl: true,
  imageUrl: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: { id: true, name: true, image: true },
  },
} as const;

// ─── GET /api/items ────────────────────────────────────────────────────────────

export async function GET() {
  const session = await requireActiveSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.item.findMany({
    select: itemSelect,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}

// ─── POST /api/items ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await requireActiveSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = createItemSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 },
    );
  }

  const { title, type, tripId, description, location, locationLat, locationLng, address, externalUrl, imageUrl } = result.data;

  // ── Double-submit protection ──────────────────────────────────────────────────
  // Reject if the same user created an identical title+type within the last 30s.
  // Guards against accidental duplicate submissions from slow networks or double-clicks.
  const recentDuplicate = await prisma.item.findFirst({
    where: {
      createdById: session.user.id,
      title: { equals: title, mode: "insensitive" },
      type,
      createdAt: { gt: new Date(Date.now() - 30_000) },
    },
    select: { id: true },
  });

  if (recentDuplicate) {
    logger.warn("item.duplicate_submission", {
      userId: session.user.id,
      title,
      type,
    });
    return NextResponse.json(
      { error: "Duplicate submission. Please wait before trying again." },
      { status: 409 },
    );
  }

  const userId = session.user.id;

  const item = await prisma.$transaction(async (tx) => {
    // 1. Create the item.
    const newItem = await tx.item.create({
      data: {
        title,
        type,
        description: description ?? null,
        location: location ?? null,
        locationLat: locationLat ?? null,
        locationLng: locationLng ?? null,
        address: address ?? null,
        externalUrl: externalUrl || null,
        imageUrl: imageUrl ?? null,
        status: "PENDING",
        createdById: userId,
        tripId,
      },
      select: itemSelect,
    });

    // 2. Auto-register the creator's APPROVE vote.
    await tx.vote.create({
      data: { userId, itemId: newItem.id, value: "APPROVE" },
    });

    // 3. Check whether the single auto-vote already meets the threshold.
    //    This happens when the trip has only one registered participant (the creator).
    const registeredParticipants = await tx.tripParticipant.count({
      where: { tripId, type: "REGISTERED", user: { status: "ACTIVE" } },
    });
    const threshold = Math.floor(registeredParticipants / 2) + 1;

    let finalStatus = newItem.status;
    if (threshold === 1) {
      await tx.item.update({
        where: { id: newItem.id },
        data: { status: "APPROVED" },
      });
      finalStatus = "APPROVED";
      logger.info("item.status.changed", {
        itemId: newItem.id,
        status: "APPROVED",
        triggeredBy: userId,
        reason: "auto_vote_threshold",
        summary: { approvals: 1, rejections: 0, required: threshold, registeredParticipants },
      });
    }

    return { ...newItem, status: finalStatus };
  });

  logger.info("item.created", { itemId: item.id, type, userId });

  return NextResponse.json(item, { status: 201 });
}
