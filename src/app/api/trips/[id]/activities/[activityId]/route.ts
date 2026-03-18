import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteCloudinaryImage } from "@/lib/cloudinary";

async function requireMember(tripId: string, userId: string) {
  return prisma.tripParticipant.findFirst({
    where: { tripId, userId },
    select: { role: true },
  });
}

// ─── PATCH /api/trips/[id]/activities/[activityId] ────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; activityId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tripId, activityId } = await params;
  const membership = await requireMember(tripId, session.user.id);
  if (!membership || membership.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activity = await prisma.activity.findFirst({
    where: { id: activityId, tripId },
    select: { id: true, photoUrl: true },
  });
  if (!activity) {
    return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
  }

  const body = (await req.json()) as {
    title?: string;
    description?: string;
    location?: string;
    locationLat?: number | null;
    locationLng?: number | null;
    activityDate?: string;
    activityTime?: string;
    notes?: string;
    photoUrl?: string | null;
    itemId?: string | null;
  };

  if (body.title !== undefined && !body.title.trim()) {
    return NextResponse.json({ error: "El título es requerido" }, { status: 400 });
  }

  // Delete old photo from Cloudinary if being replaced
  if (body.photoUrl !== undefined && body.photoUrl !== activity.photoUrl) {
    void deleteCloudinaryImage(activity.photoUrl);
  }

  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: {
      ...(body.title !== undefined && { title: body.title.trim() }),
      ...(body.description !== undefined && {
        description: body.description?.trim() || null,
      }),
      ...(body.location !== undefined && {
        location: body.location?.trim() || null,
      }),
      ...(body.locationLat !== undefined && { locationLat: body.locationLat ?? null }),
      ...(body.locationLng !== undefined && { locationLng: body.locationLng ?? null }),
      ...(body.activityDate !== undefined && {
        activityDate: body.activityDate ? new Date(body.activityDate) : null,
      }),
      ...(body.activityTime !== undefined && {
        activityTime: body.activityTime || null,
      }),
      ...(body.notes !== undefined && {
        notes: body.notes?.trim() || null,
      }),
      ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl ?? null }),
      ...(body.itemId !== undefined && { itemId: body.itemId ?? null }),
    },
  });

  return NextResponse.json(updated);
}

// ─── DELETE /api/trips/[id]/activities/[activityId] ───────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; activityId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId, activityId } = await params;
  const membership = await requireMember(tripId, session.user.id);
  if (!membership || membership.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activity = await prisma.activity.findFirst({
    where: { id: activityId, tripId },
    select: { id: true, photoUrl: true },
  });
  if (!activity) {
    return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
  }

  await prisma.activity.delete({ where: { id: activityId } });
  void deleteCloudinaryImage(activity.photoUrl);
  return new NextResponse(null, { status: 204 });
}
