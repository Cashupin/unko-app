import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Currency } from "@/generated/prisma/client";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  scope: z.enum(["GROUP", "INDIVIDUAL"]).optional(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  buyFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  buyTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  buyDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  price: z.number().positive().nullable().optional(),
  currency: z.string().optional(),
  link: z.string().url().nullable().optional().or(z.literal("")),
  notes: z.string().max(500).nullable().optional(),
  activityId: z.string().nullable().optional(),
  isPurchased: z.boolean().optional(),
  purchasedById: z.string().nullable().optional(),
});

async function getParticipant(tripId: string, userId: string) {
  return prisma.tripParticipant.findFirst({
    where: { tripId, userId },
    select: { id: true, role: true },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; ticketId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId, ticketId } = await params;
  const participant = await getParticipant(tripId, session.user.id);
  if (!participant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, tripId } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const result = patchSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { link, currency, purchasedById, ...rest } = result.data;
  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      ...rest,
      ...(link !== undefined ? { link: link || null } : {}),
      ...(currency !== undefined ? { currency: currency as Currency } : {}),
      ...(purchasedById !== undefined ? { purchasedById } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; ticketId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId, ticketId } = await params;
  const participant = await getParticipant(tripId, session.user.id);
  if (!participant || participant.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, tripId } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.ticket.delete({ where: { id: ticketId } });
  return NextResponse.json({ deleted: true });
}
