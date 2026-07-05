import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  location: z.string().trim().max(500).nullable().optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
});

// ─── PATCH /api/trips/[id]/personal-activities/[activityId] ───────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; activityId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tripId, activityId } = await params;

  const activity = await prisma.personalActivity.findFirst({
    where: { id: activityId, tripId, userId: session.user.id },
    select: { id: true },
  });

  if (!activity) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const updated = await prisma.personalActivity.update({
    where: { id: activityId },
    data: result.data,
  });

  return NextResponse.json(updated);
}

// ─── DELETE /api/trips/[id]/personal-activities/[activityId] ──────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; activityId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tripId, activityId } = await params;

  const activity = await prisma.personalActivity.findFirst({
    where: { id: activityId, tripId, userId: session.user.id },
    select: { id: true },
  });

  if (!activity) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.personalActivity.delete({ where: { id: activityId } });

  return new NextResponse(null, { status: 204 });
}
