import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

async function requireMember(tripId: string, userId: string) {
  return prisma.tripParticipant.findFirst({
    where: { tripId, userId },
    select: { role: true },
  });
}

const createPaymentSchema = z.object({
  fromParticipantId: z.string().cuid(),
  toParticipantId: z.string().cuid(),
  amount: z.number().positive(),
  currency: z.enum(["CLP", "JPY", "USD", "EUR", "GBP", "KRW", "CNY", "THB"]),
  paidAt: z.string().optional(),
});

// ─── GET /api/trips/[id]/payments ─────────────────────────────────────────────

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

  const payments = await prisma.payment.findMany({
    where: { tripId },
    select: {
      id: true, amount: true, currency: true, paidAt: true, createdAt: true,
      fromParticipant: { select: { id: true, name: true } },
      toParticipant: { select: { id: true, name: true } },
    },
    orderBy: { paidAt: "desc" },
  });

  return NextResponse.json({ payments });
}

// ─── POST /api/trips/[id]/payments ────────────────────────────────────────────

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

  const result = createPaymentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { fromParticipantId, toParticipantId, amount, currency, paidAt } = result.data;

  if (fromParticipantId === toParticipantId) {
    return NextResponse.json({ error: "El pagador y el receptor no pueden ser el mismo" }, { status: 400 });
  }

  // Validate both participants belong to this trip
  const participantCount = await prisma.tripParticipant.count({
    where: { id: { in: [fromParticipantId, toParticipantId] }, tripId },
  });
  if (participantCount !== 2) {
    return NextResponse.json({ error: "Participantes inválidos" }, { status: 400 });
  }

  const { payment } = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        tripId,
        fromParticipantId,
        toParticipantId,
        amount,
        currency,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
      },
      select: {
        id: true, amount: true, currency: true, paidAt: true, createdAt: true,
        fromParticipant: { select: { id: true, name: true } },
        toParticipant: { select: { id: true, name: true } },
      },
    });

    // Auto-mark: all of fromParticipant's pending splits on toParticipant's expenses
    await tx.expenseParticipant.updateMany({
      where: {
        expense: { tripId, isActive: true, paidByParticipantId: toParticipantId },
        participantId: fromParticipantId,
        paid: false,
      },
      data: { paid: true },
    });

    // Deactivate expenses where every non-payer split is now paid
    const affected = await tx.expense.findMany({
      where: { tripId, isActive: true, paidByParticipantId: toParticipantId },
      select: {
        id: true,
        participants: {
          where: { participantId: { not: toParticipantId } },
          select: { paid: true },
        },
      },
    });
    const toDeactivate = affected
      .filter((e) => e.participants.length > 0 && e.participants.every((ep) => ep.paid))
      .map((e) => e.id);
    if (toDeactivate.length > 0) {
      await tx.expense.updateMany({
        where: { id: { in: toDeactivate } },
        data: { isActive: false },
      });
    }

    return { payment };
  });

  broadcast(`trip:${tripId}`, "update");
  return NextResponse.json(payment, { status: 201 });
}
