import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

// POST /api/trips/[id]/compensate
// Finds all pairs of participants that have mutual unpaid splits (A owes B and B owes A)
// and marks them all as paid — no Payment record is created because no money actually moves.
// Requires EDITOR or ADMIN role.

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tripId } = await params;

  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId, userId: session.user.id },
    select: { role: true },
  });
  if (!membership || membership.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Load all active expenses with their payer and unpaid splits
  const expenses = await prisma.expense.findMany({
    where: { tripId, isActive: true, paidByParticipantId: { not: null } },
    select: {
      id: true,
      paidByParticipantId: true,
      participants: {
        select: { id: true, participantId: true, paid: true },
      },
    },
  });

  // Build: paidByParticipantId → set of participantIds that still owe them
  const owesMap = new Map<string, Set<string>>();
  for (const exp of expenses) {
    const payerId = exp.paidByParticipantId!;
    if (!owesMap.has(payerId)) owesMap.set(payerId, new Set());
    for (const split of exp.participants) {
      if (split.participantId !== payerId && !split.paid) {
        owesMap.get(payerId)!.add(split.participantId);
      }
    }
  }

  // Find mutual pairs: A owes B AND B owes A
  const mutualPairs: [string, string][] = [];
  const seen = new Set<string>();
  for (const [payerId, debtors] of owesMap) {
    for (const debtorId of debtors) {
      const key = [payerId, debtorId].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      // mutual: debtorId also has payerId as someone who owes them
      if (owesMap.get(debtorId)?.has(payerId)) {
        mutualPairs.push([payerId, debtorId]);
      }
    }
  }

  if (mutualPairs.length === 0) {
    return NextResponse.json({ compensated: 0 });
  }

  // For each mutual pair, mark their splits as paid and deactivate fully-settled expenses
  let totalMarked = 0;
  await prisma.$transaction(async (tx) => {
    for (const [a, b] of mutualPairs) {
      // Mark b's splits on a's expenses as paid (b owes a)
      const resBA = await tx.expenseParticipant.updateMany({
        where: {
          expense: { tripId, isActive: true, paidByParticipantId: a },
          participantId: b,
          paid: false,
        },
        data: { paid: true },
      });
      // Mark a's splits on b's expenses as paid (a owes b)
      const resAB = await tx.expenseParticipant.updateMany({
        where: {
          expense: { tripId, isActive: true, paidByParticipantId: b },
          participantId: a,
          paid: false,
        },
        data: { paid: true },
      });
      totalMarked += resBA.count + resAB.count;
    }

    // Deactivate any expense where all debtor splits are now paid
    const allExpenses = await tx.expense.findMany({
      where: { tripId, isActive: true },
      select: {
        id: true,
        paidByParticipantId: true,
        participants: {
          where: { paid: false },
          select: { participantId: true },
        },
      },
    });
    const toDeactivate = allExpenses
      .filter((e) => {
        const unpaidDebtors = e.participants.filter(
          (ep) => ep.participantId !== e.paidByParticipantId,
        );
        return unpaidDebtors.length === 0;
      })
      .map((e) => e.id);

    if (toDeactivate.length > 0) {
      await tx.expense.updateMany({
        where: { id: { in: toDeactivate } },
        data: { isActive: false },
      });
    }
  });

  broadcast(`trip:${tripId}`, "update");
  return NextResponse.json({ compensated: totalMarked, pairs: mutualPairs.length });
}
