import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireMember(tripId: string, userId: string) {
  return prisma.tripParticipant.findFirst({
    where: { tripId, userId },
    select: { role: true },
  });
}

const createActivitySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  location: z.string().trim().max(500).optional(),
  locationLat: z.number().min(-90).max(90).optional().nullable(),
  locationLng: z.number().min(-180).max(180).optional().nullable(),
  activityDate: z.string().optional().or(z.literal("")),
  activityTime: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional(),
  photoUrl: z.string().url().optional().or(z.literal("")).or(z.null()),
  itemId: z.string().cuid().optional(),
});

// ─── GET /api/trips/[id]/activities ───────────────────────────────────────────

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

  const activities = await prisma.activity.findMany({
    where: { tripId },
    select: {
      id: true, title: true, description: true, location: true,
      activityDate: true, activityTime: true, notes: true, photoUrl: true, createdAt: true,
      item: { select: { id: true, title: true } },
    },
    orderBy: [{ activityDate: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ activities });
}

// ─── POST /api/trips/[id]/activities ──────────────────────────────────────────

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

  const result = createActivitySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  let { title, description, location, locationLat, locationLng, activityDate, activityTime, notes, photoUrl, itemId } = result.data;

  // If created from an Item, inherit its data as defaults
  if (itemId) {
    const item = await prisma.item.findFirst({
      where: { id: itemId, tripId, status: "APPROVED" },
      select: { title: true, description: true, location: true, locationLat: true, locationLng: true, imageUrl: true },
    });
    if (!item) {
      return NextResponse.json({ error: "Item no encontrado o no aprobado" }, { status: 404 });
    }
    if (!title || title === item.title) title = item.title;
    if (!description) description = item.description ?? undefined;
    if (!location) { location = item.location ?? undefined; locationLat = item.locationLat ?? undefined; locationLng = item.locationLng ?? undefined; }
    if (!photoUrl) photoUrl = item.imageUrl ?? undefined;
  }

  const activity = await prisma.activity.create({
    data: {
      tripId,
      title,
      description: description ?? null,
      location: location ?? null,
      locationLat: locationLat ?? null,
      locationLng: locationLng ?? null,
      activityDate: activityDate ? new Date(activityDate) : null,
      activityTime: activityTime || null,
      notes: notes ?? null,
      photoUrl: photoUrl || null,
      itemId: itemId ?? null,
    },
    select: {
      id: true, title: true, description: true, location: true, locationLat: true, locationLng: true,
      activityDate: true, activityTime: true, notes: true, photoUrl: true, createdAt: true,
      item: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
