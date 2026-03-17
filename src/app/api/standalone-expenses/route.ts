import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateSettlement } from "@/lib/settlement";

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
        participantNames: z.array(z.string().trim().min(1)).min(1),
      }),
    )
    .min(1),
});

const createSchema = z.discriminatedUnion("splitType", [equalSchema, itemizedSchema]);

// Shared expense select shape
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

// ─── GET /api/standalone-expenses ─────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawExpenses = await prisma.expense.findMany({
    where: { trip: { isStandaloneGroup: true, createdById: session.user.id } },
    select: expenseSelect,
    orderBy: { expenseDate: "desc" },
  });

  // Attach per-expense settlement
  const expenses = rawExpenses.map((expense) => {
    const participants = expense.participants.map((ep) => ({
      id: ep.participant.id,
      name: ep.participant.name,
    }));
    const { settlements } = calculateSettlement(
      [
        {
          id: expense.id,
          amount: expense.amount,
          currency: expense.currency,
          paidByParticipantId: expense.paidBy?.id ?? null,
          participants: expense.participants.map((ep) => ({
            participantId: ep.participant.id,
            amount: ep.amount,
          })),
        },
      ],
      participants,
      [],
    );
    return { ...expense, settlement: settlements };
  });

  return NextResponse.json({ expenses });
}

// ─── POST /api/standalone-expenses ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = createSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 },
    );
  }

  const data = result.data;

  // Validate paidByName is in participants list
  if (!data.participants.includes(data.paidByName)) {
    return NextResponse.json(
      { error: "El pagador debe ser uno de los participantes" },
      { status: 400 },
    );
  }

  const userId = session.user.id;

  const expense = await prisma.$transaction(async (tx) => {
    // 1. Fetch creator name for the ADMIN participant
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // 2. Create virtual standalone trip
    const trip = await tx.trip.create({
      data: {
        name: data.description.slice(0, 50),
        defaultCurrency: data.currency,
        isStandaloneGroup: true,
        createdById: userId,
      },
    });

    // 3. Add creator as ADMIN (for ownership — not necessarily an expense participant)
    await tx.tripParticipant.create({
      data: {
        tripId: trip.id,
        userId,
        name: user?.name ?? user?.email ?? userId,
        type: "REGISTERED",
        role: "ADMIN",
      },
    });

    // 4. Create ghost participants from names list
    const ghostParticipants = await Promise.all(
      data.participants.map((name) =>
        tx.tripParticipant.create({
          data: { tripId: trip.id, name, type: "GHOST", role: "VIEWER" },
          select: { id: true, name: true },
        }),
      ),
    );

    // Map name → id
    const nameToId = new Map(ghostParticipants.map((p) => [p.name, p.id]));

    const paidByParticipantId = nameToId.get(data.paidByName) ?? null;

    if (data.splitType === "EQUAL") {
      const splitNames = data.splitParticipantNames ?? data.participants;
      const splitIds = splitNames
        .map((n) => nameToId.get(n))
        .filter((id): id is string => !!id);

      if (splitIds.length === 0) {
        throw new Error("No se encontraron participantes para dividir");
      }

      const perPerson = Math.floor((data.amount / splitIds.length) * 100) / 100;
      const remainder =
        Math.round((data.amount - perPerson * splitIds.length) * 100) / 100;

      return tx.expense.create({
        data: {
          tripId: trip.id,
          createdById: userId,
          paidByParticipantId,
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          receiptUrl: data.receiptUrl ?? null,
          expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
          splitType: "EQUAL",
          participants: {
            create: splitIds.map((pid, i) => ({
              participantId: pid,
              amount: i === 0 ? perPerson + remainder : perPerson,
            })),
          },
        },
        select: expenseSelect,
      });
    }

    // ── ITEMIZED ──────────────────────────────────────────────────────────────

    const totalAmount =
      Math.round(data.items.reduce((s, i) => s + i.amount, 0) * 100) / 100;

    const amountByParticipant = new Map<string, number>();
    for (const item of data.items) {
      const itemParticipantIds = item.participantNames
        .map((n) => nameToId.get(n))
        .filter((id): id is string => !!id);
      if (itemParticipantIds.length === 0) continue;
      const share = item.amount / itemParticipantIds.length;
      for (const pid of itemParticipantIds) {
        amountByParticipant.set(pid, (amountByParticipant.get(pid) ?? 0) + share);
      }
    }
    for (const [pid, amt] of amountByParticipant) {
      amountByParticipant.set(pid, Math.round(amt * 100) / 100);
    }

    return tx.expense.create({
      data: {
        tripId: trip.id,
        createdById: userId,
        paidByParticipantId,
        description: data.description,
        amount: totalAmount,
        currency: data.currency,
        receiptUrl: data.receiptUrl ?? null,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
        splitType: "ITEMIZED",
        participants: {
          create: Array.from(amountByParticipant.entries()).map(([pid, amt]) => ({
            participantId: pid,
            amount: amt,
          })),
        },
        items: {
          create: data.items.map((item) => {
            const ids = item.participantNames
              .map((n) => nameToId.get(n))
              .filter((id): id is string => !!id);
            return {
              description: item.description,
              amount: item.amount,
              participants: { create: ids.map((pid) => ({ participantId: pid })) },
            };
          }),
        },
      },
      select: expenseSelect,
    });
  });

  // Attach settlement to response
  const participants = expense.participants.map((ep) => ({
    id: ep.participant.id,
    name: ep.participant.name,
  }));
  const { settlements } = calculateSettlement(
    [
      {
        id: expense.id,
        amount: expense.amount,
        currency: expense.currency,
        paidByParticipantId: expense.paidBy?.id ?? null,
        participants: expense.participants.map((ep) => ({
          participantId: ep.participant.id,
          amount: ep.amount,
        })),
      },
    ],
    participants,
    [],
  );

  return NextResponse.json({ ...expense, settlement: settlements }, { status: 201 });
}
