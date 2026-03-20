import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateSettlement } from "@/modules/expenses/lib/settlement";

const CURRENCIES = ["CLP", "JPY", "USD", "EUR", "GBP", "KRW", "CNY", "THB"] as const;

const equalSchema = z.object({
  splitType: z.literal("EQUAL"),
  description: z.string().trim().min(1).max(500),
  amount: z.number().positive(),
  currency: z.enum(CURRENCIES),
  expenseDate: z.string().optional(),
  receiptUrl: z.string().url().optional().nullable(),
  participants: z.array(z.string().trim().min(1).max(100)).min(1).max(20),
  paidByName: z.string().trim().min(1),
  splitParticipantNames: z.array(z.string().trim().min(1)).min(1).optional(),
});

const itemizedSchema = z.object({
  splitType: z.literal("ITEMIZED"),
  description: z.string().trim().min(1).max(500),
  currency: z.enum(CURRENCIES),
  expenseDate: z.string().optional(),
  receiptUrl: z.string().url().optional().nullable(),
  participants: z.array(z.string().trim().min(1).max(100)).min(1).max(20),
  paidByName: z.string().trim().min(1),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(200),
        amount: z.number().positive(),
        participantNames: z.array(z.string().trim().min(1)).min(0),
        groupKey: z.string().optional(),
        groupQty: z.number().int().positive().optional(),
        itemQty: z.number().int().positive().optional(),
      }),
    )
    .min(1),
});

const updateSchema = z.discriminatedUnion("splitType", [equalSchema, itemizedSchema]);

const expenseSelect = {
  id: true,
  description: true,
  amount: true,
  currency: true,
  paymentMethod: true,
  receiptUrl: true,
  expenseDate: true,
  splitType: true,
  isActive: true,
  shareToken: true,
  createdById: true,
  createdAt: true,
  trip: { select: { id: true } },
  paidBy: { select: { id: true, name: true } },
  participants: {
    select: {
      participantId: true,
      amount: true,
      paid: true,
      participant: { select: { id: true, name: true } },
    },
  },
  items: {
    select: {
      id: true,
      description: true,
      amount: true,
      participants: {
        select: { participant: { select: { id: true, name: true } } },
      },
    },
    orderBy: { id: "asc" } as const,
  },
} as const;

async function verifyOwnership(expenseId: string, userId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: {
      tripId: true,
      trip: { select: { isStandaloneGroup: true, createdById: true } },
    },
  });

  if (!expense?.trip?.isStandaloneGroup) return null;
  if (expense.trip.createdById !== userId) return null;
  return expense.tripId!;
}

// ─── PATCH /api/standalone-expenses/[expenseId] ───────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { expenseId } = await params;
  const tripId = await verifyOwnership(expenseId, session.user.id);
  if (!tripId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 },
    );
  }

  const data = result.data;

  if (!data.participants.includes(data.paidByName)) {
    return NextResponse.json(
      { error: "El pagador debe ser uno de los participantes" },
      { status: 400 },
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    // 1. Wipe existing ghost participants, expense participants and items
    await tx.expenseItemParticipant.deleteMany({
      where: { expenseItem: { expenseId } },
    });
    await tx.expenseItem.deleteMany({ where: { expenseId } });
    await tx.expenseParticipant.deleteMany({ where: { expenseId } });
    await tx.tripParticipant.deleteMany({
      where: { tripId, type: "GHOST" },
    });

    // 2. Re-create ghost participants
    const ghostParticipants = await Promise.all(
      data.participants.map((name) =>
        tx.tripParticipant.create({
          data: { tripId, name, type: "GHOST", role: "VIEWER" },
          select: { id: true, name: true },
        }),
      ),
    );

    const nameToId = new Map(ghostParticipants.map((p) => [p.name, p.id]));
    const paidByParticipantId = nameToId.get(data.paidByName) ?? null;

    if (data.splitType === "EQUAL") {
      const splitNames = data.splitParticipantNames ?? data.participants;
      const splitIds = splitNames
        .map((n) => nameToId.get(n))
        .filter((id): id is string => !!id);

      const perPerson = Math.floor((data.amount / splitIds.length) * 100) / 100;
      const remainder =
        Math.round((data.amount - perPerson * splitIds.length) * 100) / 100;

      await tx.expenseParticipant.createMany({
        data: splitIds.map((pid, i) => ({
          expenseId,
          participantId: pid,
          amount: i === 0 ? perPerson + remainder : perPerson,
        })),
      });

      return tx.expense.update({
        where: { id: expenseId },
        data: {
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          receiptUrl: data.receiptUrl ?? null,
          expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
          splitType: "EQUAL",
          paidByParticipantId,
        },
        select: expenseSelect,
      });
    }

    // ITEMIZED
    const totalAmount =
      Math.round(data.items.reduce((s, i) => s + i.amount, 0) * 100) / 100;

    const amountByParticipant = new Map<string, number>();
    for (const item of data.items) {
      const ids = item.participantNames
        .map((n) => nameToId.get(n))
        .filter((id): id is string => !!id);
      if (ids.length === 0) continue;
      const share = item.amount / ids.length;
      for (const pid of ids) {
        amountByParticipant.set(pid, (amountByParticipant.get(pid) ?? 0) + share);
      }
    }
    for (const [pid, amt] of amountByParticipant) {
      amountByParticipant.set(pid, Math.round(amt * 100) / 100);
    }

    await tx.expenseParticipant.createMany({
      data: Array.from(amountByParticipant.entries()).map(([pid, amt]) => ({
        expenseId,
        participantId: pid,
        amount: amt,
      })),
    });

    for (const item of data.items) {
      const ids = item.participantNames
        .map((n) => nameToId.get(n))
        .filter((id): id is string => !!id);
      const createdItem = await tx.expenseItem.create({
        data: {
          expenseId,
          description: item.description,
          amount: item.amount,
          groupKey: item.groupKey ?? null,
          groupQty: item.groupQty ?? null,
          itemQty: item.itemQty ?? null,
        },
        select: { id: true },
      });
      if (ids.length > 0) {
        await tx.expenseItemParticipant.createMany({
          data: ids.map((pid) => ({ expenseItemId: createdItem.id, participantId: pid })),
        });
      }
    }

    return tx.expense.update({
      where: { id: expenseId },
      data: {
        description: data.description,
        amount: totalAmount,
        currency: data.currency,
        receiptUrl: data.receiptUrl ?? null,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
        splitType: "ITEMIZED",
        paidByParticipantId,
      },
      select: expenseSelect,
    });
  });

  const participants = updated.participants.map((ep) => ({
    id: ep.participant.id,
    name: ep.participant.name,
  }));
  const { settlements } = calculateSettlement(
    [
      {
        id: updated.id,
        amount: updated.amount,
        currency: updated.currency,
        paidByParticipantId: updated.paidBy?.id ?? null,
        participants: updated.participants.map((ep) => ({
          participantId: ep.participant.id,
          amount: ep.amount,
        })),
      },
    ],
    participants,
    [],
  );

  return NextResponse.json({ ...updated, settlement: settlements });
}

// ─── DELETE /api/standalone-expenses/[expenseId] ──────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { expenseId } = await params;
  const tripId = await verifyOwnership(expenseId, session.user.id);
  if (!tripId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.trip.delete({ where: { id: tripId } });

  return new NextResponse(null, { status: 204 });
}
