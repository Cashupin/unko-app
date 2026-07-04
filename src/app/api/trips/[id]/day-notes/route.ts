import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const upsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().max(120),
});

async function getParticipant(tripId: string, userId: string) {
  return prisma.tripParticipant.findFirst({
    where: { tripId, userId, type: "REGISTERED" },
    select: { role: true },
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId } = await params;
  const participant = await getParticipant(tripId, session.user.id);
  if (!participant || participant.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const result = upsertSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { date, label } = result.data;

  if (!label.trim()) {
    await prisma.dayNote.deleteMany({ where: { tripId, date } });
    return NextResponse.json({ deleted: true });
  }

  const note = await prisma.dayNote.upsert({
    where: { tripId_date: { tripId, date } },
    update: { label: label.trim() },
    create: { tripId, date, label: label.trim() },
  });

  return NextResponse.json(note);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId } = await params;
  const participant = await getParticipant(tripId, session.user.id);
  if (!participant || participant.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 });

  await prisma.dayNote.deleteMany({ where: { tripId, date } });
  return NextResponse.json({ deleted: true });
}
