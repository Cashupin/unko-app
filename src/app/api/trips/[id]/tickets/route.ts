import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Currency } from "@/generated/prisma/client";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  scope: z.enum(["GROUP", "INDIVIDUAL"]).default("GROUP"),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  buyFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  buyDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  price: z.number().positive().optional().nullable(),
  currency: z.string().default("JPY"),
  link: z.string().url().optional().nullable().or(z.literal("")),
  notes: z.string().max(500).optional().nullable(),
  activityId: z.string().optional().nullable(),
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

  const tickets = await prisma.ticket.findMany({
    where: { tripId },
    include: {
      activity: { select: { id: true, title: true, activityDate: true } },
      purchasedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ buyDeadline: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ tickets });
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
  if (!participant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const result = createSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { link, currency, ...rest } = result.data;
  const ticket = await prisma.ticket.create({
    data: {
      ...rest,
      link: link || null,
      currency: currency as Currency,
      tripId,
      createdById: session.user.id,
    },
  });

  return NextResponse.json(ticket, { status: 201 });
}
