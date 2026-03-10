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

const CURRENCIES = ["CLP", "JPY", "USD", "EUR", "GBP", "KRW", "CNY", "THB"] as const;

const PAYMENT_METHODS = ["CASH", "DEBIT", "CREDIT"] as const;

const equalSchema = z.object({
  splitType: z.literal("EQUAL"),
  description: z.string().trim().min(1).max(500),
  amount: z.number().positive(),
  currency: z.enum(CURRENCIES),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  paidByParticipantId: z.string().cuid().optional(),
  expenseDate: z.string().optional(),
  participantIds: z.array(z.string().cuid()).min(1),
});

const itemizedSchema = z.object({
  splitType: z.literal("ITEMIZED"),
  description: z.string().trim().min(1).max(500),
  currency: z.enum(CURRENCIES),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  paidByParticipantId: z.string().cuid().optional(),
  expenseDate: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(50),
        amount: z.number().positive(),
        participantIds: z.array(z.string().cuid()).min(1),
      }),
    )
    .min(1),
});

const editExpenseSchema = z.discriminatedUnion("splitType", [equalSchema, itemizedSchema]);

// ─── PATCH /api/trips/[id]/expenses/[expenseId] — edit ────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId, expenseId } = await params;
  const membership = await requireMember(tripId, session.user.id);
  if (!membership || membership.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, tripId },
    select: {
      id: true,
      createdById: true,
      participants: { select: { paid: true } },
    },
  });
  if (!expense) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
  }
  if (expense.createdById !== session.user.id && membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (expense.participants.some((p) => p.paid)) {
    return NextResponse.json(
      { error: "No se puede editar: alguien ya marcó su parte como pagada" },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = editExpenseSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const data = result.data;

  if (data.splitType === "EQUAL") {
    const { description, amount, currency, paymentMethod, paidByParticipantId, expenseDate, participantIds } = data;
    const participantCount = await prisma.tripParticipant.count({
      where: { id: { in: participantIds }, tripId },
    });
    if (participantCount !== participantIds.length) {
      return NextResponse.json({ error: "Uno o más participantes no pertenecen al viaje" }, { status: 400 });
    }
    const perPerson = Math.floor((amount / participantIds.length) * 100) / 100;
    const remainder = Math.round((amount - perPerson * participantIds.length) * 100) / 100;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.expenseParticipant.deleteMany({ where: { expenseId } });
      await tx.expenseItem.deleteMany({ where: { expenseId } });
      return tx.expense.update({
        where: { id: expenseId },
        data: {
          description,
          amount,
          currency,
          paymentMethod: paymentMethod ?? "CASH",
          paidByParticipantId: paidByParticipantId ?? null,
          expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
          splitType: "EQUAL",
          participants: {
            create: participantIds.map((pid, i) => ({
              participantId: pid,
              amount: i === 0 ? perPerson + remainder : perPerson,
            })),
          },
        },
        select: { id: true },
      });
    });
    return NextResponse.json(updated);
  }

  // ITEMIZED
  const { description, currency, paymentMethod, paidByParticipantId, expenseDate, items } = data;
  const allParticipantIds = [...new Set(items.flatMap((i) => i.participantIds))];
  const participantCount = await prisma.tripParticipant.count({
    where: { id: { in: allParticipantIds }, tripId },
  });
  if (participantCount !== allParticipantIds.length) {
    return NextResponse.json({ error: "Uno o más participantes no pertenecen al viaje" }, { status: 400 });
  }
  const totalAmount = Math.round(items.reduce((s, i) => s + i.amount, 0) * 100) / 100;
  const amountByParticipant = new Map<string, number>();
  for (const item of items) {
    const share = item.amount / item.participantIds.length;
    for (const pid of item.participantIds) {
      amountByParticipant.set(pid, (amountByParticipant.get(pid) ?? 0) + share);
    }
  }
  for (const [pid, amt] of amountByParticipant) {
    amountByParticipant.set(pid, Math.round(amt * 100) / 100);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.expenseParticipant.deleteMany({ where: { expenseId } });
    await tx.expenseItem.deleteMany({ where: { expenseId } });
    return tx.expense.update({
      where: { id: expenseId },
      data: {
        description,
        amount: totalAmount,
        currency,
        paymentMethod: paymentMethod ?? "CASH",
        paidByParticipantId: paidByParticipantId ?? null,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        splitType: "ITEMIZED",
        participants: {
          create: Array.from(amountByParticipant.entries()).map(([pid, amt]) => ({
            participantId: pid,
            amount: amt,
          })),
        },
        items: {
          create: items.map((item) => ({
            description: item.description,
            amount: item.amount,
            participants: {
              create: item.participantIds.map((pid) => ({ participantId: pid })),
            },
          })),
        },
      },
      select: { id: true },
    });
  });
  return NextResponse.json(updated);
}

// ─── DELETE /api/trips/[id]/expenses/[expenseId] ──────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId, expenseId } = await params;
  const membership = await requireMember(tripId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, tripId },
    select: { id: true, createdById: true, participants: { select: { paid: true } } },
  });
  if (!expense) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
  }
  if (expense.createdById !== session.user.id && membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (expense.participants.some((p) => p.paid)) {
    return NextResponse.json(
      { error: "No se puede eliminar: alguien ya marcó su parte como pagada. Usa 'Deshabilitar'." },
      { status: 409 },
    );
  }

  await prisma.expense.delete({ where: { id: expenseId } });
  return new NextResponse(null, { status: 204 });
}
