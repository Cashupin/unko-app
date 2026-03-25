import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotificationMany } from "@/modules/notifications/lib/notifications";

async function requireMember(tripId: string, userId: string) {
  return prisma.tripParticipant.findFirst({
    where: { tripId, userId },
    select: { role: true },
  });
}

const CURRENCIES = ["CLP", "JPY", "USD", "EUR", "GBP", "KRW", "CNY", "THB"] as const;

const PAYMENT_METHODS = ["CASH", "DEBIT", "CREDIT"] as const;

const CATEGORIES = ["FOOD", "TRANSPORT", "ACCOMMODATION", "ACTIVITY", "OTHER"] as const;

const equalSchema = z.object({
  splitType: z.literal("EQUAL"),
  description: z.string().trim().min(1).max(500),
  amount: z.number().positive(),
  currency: z.enum(CURRENCIES),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  receiptUrl: z.string().url().optional(),
  paidByParticipantId: z.string().cuid().optional(),
  expenseDate: z.string().optional(),
  participantIds: z.array(z.string().cuid()).min(1),
  category: z.enum(CATEGORIES).optional(),
});

const itemizedSchema = z.object({
  splitType: z.literal("ITEMIZED"),
  description: z.string().trim().min(1).max(500),
  currency: z.enum(CURRENCIES),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  receiptUrl: z.string().url().optional(),
  paidByParticipantId: z.string().cuid().optional(),
  expenseDate: z.string().optional(),
  category: z.enum(CATEGORIES).optional(),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(50),
        amount: z.number().positive(),
        participantIds: z.array(z.string().cuid()).min(1),
        groupKey: z.string().optional(),
        groupQty: z.number().int().positive().optional(),
        itemQty: z.number().int().positive().optional(),
      }),
    )
    .min(1),
});

const createExpenseSchema = z.discriminatedUnion("splitType", [
  equalSchema,
  itemizedSchema,
]);

// ─── GET /api/trips/[id]/expenses ─────────────────────────────────────────────

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

  const expenses = await prisma.expense.findMany({
    where: { tripId },
    select: {
      id: true,
      description: true,
      amount: true,
      currency: true,
      expenseDate: true,
      splitType: true,
      createdAt: true,
      paidBy: { select: { id: true, name: true } },
      participants: {
        select: {
          amount: true,
          participant: { select: { id: true, name: true } },
        },
      },
      items: {
        select: {
          id: true,
          description: true,
          amount: true,
          participants: {
            select: {
              participant: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { expenseDate: "desc" },
  });

  return NextResponse.json({ expenses });
}

// ─── POST /api/trips/[id]/expenses ────────────────────────────────────────────

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
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = createExpenseSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 },
    );
  }

  const data = result.data;

  if (data.splitType === "EQUAL") {
    const { description, amount, currency, paymentMethod, receiptUrl, paidByParticipantId, expenseDate, participantIds, category } = data;

    const participantRows = await prisma.tripParticipant.findMany({
      where: { id: { in: participantIds }, tripId },
      select: { id: true, userId: true, name: true },
    });
    if (participantRows.length !== participantIds.length) {
      return NextResponse.json(
        { error: "Uno o más participantes no pertenecen al viaje" },
        { status: 400 },
      );
    }

    const perPerson = Math.floor((amount / participantIds.length) * 100) / 100;
    const remainder =
      Math.round((amount - perPerson * participantIds.length) * 100) / 100;

    const expense = await prisma.expense.create({
      data: {
        tripId,
        createdById: session.user.id,
        paidByParticipantId: paidByParticipantId ?? null,
        description,
        amount,
        currency,
        paymentMethod: paymentMethod ?? "CASH",
        receiptUrl: receiptUrl ?? null,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        splitType: "EQUAL",
        category: category ?? "OTHER",
        participants: {
          create: participantIds.map((pid, i) => ({
            participantId: pid,
            amount: i === 0 ? perPerson + remainder : perPerson,
          })),
        },
      },
      select: expenseSelect,
    });

    // Notificar a deudores (participantes que no son el pagador, con cuenta real)
    const payerId = paidByParticipantId ?? null;
    const debtorNotifications = participantRows
      .filter((p) => p.userId && p.userId !== session.user.id && p.id !== payerId)
      .map((p) => ({
        userId: p.userId!,
        type: "EXPENSE_CREATED" as const,
        title: `Nuevo gasto: ${description}`,
        body: `Debes ${perPerson.toLocaleString("es-CL")} ${currency}.`,
        link: `/trips/${tripId}?tab=gastos`,
      }));
    createNotificationMany(debtorNotifications).catch(() => {});

    prisma.trip.update({ where: { id: tripId }, data: {} }).catch(() => {});
    return NextResponse.json(expense, { status: 201 });
  }

  // ── ITEMIZED ────────────────────────────────────────────────────────────────

  const { description, currency, paymentMethod, receiptUrl, paidByParticipantId, expenseDate, items, category } = data;

  // Collect all unique participantIds across all items
  const allParticipantIds = [...new Set(items.flatMap((i) => i.participantIds))];

  const allParticipantRows = await prisma.tripParticipant.findMany({
    where: { id: { in: allParticipantIds }, tripId },
    select: { id: true, userId: true },
  });
  if (allParticipantRows.length !== allParticipantIds.length) {
    return NextResponse.json(
      { error: "Uno o más participantes no pertenecen al viaje" },
      { status: 400 },
    );
  }

  const totalAmount = Math.round(items.reduce((s, i) => s + i.amount, 0) * 100) / 100;

  // Calculate per-participant amounts from items
  const amountByParticipant = new Map<string, number>();
  for (const item of items) {
    const share = item.amount / item.participantIds.length;
    for (const pid of item.participantIds) {
      amountByParticipant.set(pid, (amountByParticipant.get(pid) ?? 0) + share);
    }
  }
  // Round each participant's amount to 2 decimal places
  for (const [pid, amt] of amountByParticipant) {
    amountByParticipant.set(pid, Math.round(amt * 100) / 100);
  }

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        tripId,
        createdById: session.user.id,
        paidByParticipantId: paidByParticipantId ?? null,
        description,
        amount: totalAmount,
        currency,
        paymentMethod: paymentMethod ?? "CASH",
        receiptUrl: receiptUrl ?? null,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        splitType: "ITEMIZED",
        category: category ?? "OTHER",
        participants: {
          create: Array.from(amountByParticipant.entries()).map(([pid, amt]) => ({
            participantId: pid,
            amount: amt,
          })),
        },
      },
      select: { id: true },
    });

    for (const item of items) {
      const createdItem = await tx.expenseItem.create({
        data: {
          expenseId: created.id,
          description: item.description,
          amount: item.amount,
          groupKey: item.groupKey ?? null,
          groupQty: item.groupQty ?? null,
          itemQty: item.itemQty ?? null,
        },
        select: { id: true },
      });
      if (item.participantIds.length > 0) {
        await tx.expenseItemParticipant.createMany({
          data: item.participantIds.map((pid) => ({ expenseItemId: createdItem.id, participantId: pid })),
        });
      }
    }

    return tx.expense.findUniqueOrThrow({ where: { id: created.id }, select: expenseSelect });
  });

  // Notificar a deudores del gasto itemizado
  const payerId = paidByParticipantId ?? null;
  const itemizedNotifications = allParticipantRows
    .filter((p) => p.userId && p.userId !== session.user.id && p.id !== payerId)
    .map((p) => ({
      userId: p.userId!,
      type: "EXPENSE_CREATED" as const,
      title: `Nuevo gasto: ${description}`,
      body: `Te han asignado ítems en un gasto compartido.`,
      link: `/trips/${tripId}?tab=gastos`,
    }));
  createNotificationMany(itemizedNotifications).catch(() => {});
  prisma.trip.update({ where: { id: tripId }, data: {} }).catch(() => {});
  return NextResponse.json(expense, { status: 201 });
}

// ─── Shared select shape ───────────────────────────────────────────────────────

const expenseSelect = {
  id: true,
  description: true,
  amount: true,
  currency: true,
  paymentMethod: true,
  receiptUrl: true,
  expenseDate: true,
  splitType: true,
  category: true,
  createdAt: true,
  paidBy: { select: { id: true, name: true } },
  participants: {
    select: {
      amount: true,
      participant: { select: { id: true, name: true } },
    },
  },
  items: {
    select: {
      id: true,
      description: true,
      amount: true,
      participants: {
        select: {
          participant: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { id: "asc" } as const,
  },
} as const;
