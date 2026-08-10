import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

async function requireMember(tripId: string, userId: string) {
  return prisma.tripParticipant.findFirst({
    where: { tripId, userId },
    select: { id: true, role: true },
  });
}

const ITEM_SELECT = {
  id: true,
  tripId: true,
  name: true,
  notes: true,
  imageUrl: true,
  bought: true,
  boughtAt: true,
  createdAt: true,
  ownedByParticipantId: true,
  ownedByParticipant: { select: { id: true, name: true } },
} as const;

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(1000).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

// ─── GET /api/trips/[id]/wishlist ────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId } = await params;
  if (!(await requireMember(tripId, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await prisma.wishlistItem.findMany({
    where: { tripId },
    select: ITEM_SELECT,
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ items });
}

// ─── POST /api/trips/[id]/wishlist ───────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId } = await params;
  const membership = await requireMember(tripId, session.user.id);
  if (!membership || membership.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = createSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { name, notes, imageUrl } = result.data;

  const item = await prisma.wishlistItem.create({
    data: {
      tripId,
      ownedByParticipantId: membership.id,
      name,
      notes: notes ?? null,
      imageUrl: imageUrl || null,
    },
    select: ITEM_SELECT,
  });

  broadcast(`trip:${tripId}`, "update");
  return NextResponse.json(item, { status: 201 });
}
