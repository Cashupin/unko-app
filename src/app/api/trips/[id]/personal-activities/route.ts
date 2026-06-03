import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireMember(tripId: string, userId: string) {
  return prisma.tripParticipant.findFirst({
    where: { tripId, userId },
    select: { id: true },
  });
}

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  location: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
  photoUrl: z.string().url().optional(),
});

// ─── GET /api/trips/[id]/personal-activities ──────────────────────────────────

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

  const activities = await prisma.personalActivity.findMany({
    where: { tripId, userId: session.user.id },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    select: { id: true, date: true, title: true, description: true, time: true, location: true, notes: true, photoUrl: true },
  });

  return NextResponse.json({ activities });
}

// ─── POST /api/trips/[id]/personal-activities ─────────────────────────────────

export async function POST(
  req: NextRequest,
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

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = createSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const activity = await prisma.personalActivity.create({
    data: { tripId, userId: session.user.id, ...result.data },
    select: { id: true, date: true, title: true, description: true, time: true, location: true, notes: true, photoUrl: true },
  });

  return NextResponse.json(activity, { status: 201 });
}
