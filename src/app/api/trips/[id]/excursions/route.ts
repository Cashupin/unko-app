import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId } = await params;
  const participant = await prisma.tripParticipant.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!participant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const excursions = await prisma.excursion.findMany({
    where: { tripId },
    include: {
      activities: {
        select: { id: true, title: true, activityDate: true, activityTime: true },
        orderBy: [{ activityTime: "asc" }],
      },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ excursions });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId } = await params;
  const participant = await prisma.tripParticipant.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!participant || participant.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const result = createSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const excursion = await prisma.excursion.create({
    data: {
      ...result.data,
      tripId,
      createdById: session.user.id,
    },
  });

  return NextResponse.json(excursion, { status: 201 });
}
