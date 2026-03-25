import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/trips/[id]/expenses/[expenseId]/splits/[participantId]
// Toggle the `paid` flag on an ExpenseParticipant.
// Rules:
//   - The split owner (debtor) can toggle their own split
//   - The paidBy participant (creditor) can toggle any split

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string; participantId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId, expenseId, participantId } = await params;

  // Get the current user's participant for this trip
  const myParticipant = await prisma.tripParticipant.findFirst({
    where: { tripId, userId: session.user.id },
    select: { id: true },
  });
  if (!myParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get the expense with paidBy and all splits
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, tripId },
    select: {
      paidByParticipantId: true,
      participants: {
        select: { id: true, participantId: true, paid: true },
      },
    },
  });
  if (!expense) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
  }

  const split = expense.participants.find((p) => p.participantId === participantId);
  if (!split) {
    return NextResponse.json({ error: "Participante no encontrado en este gasto" }, { status: 404 });
  }

  const isCreditor = expense.paidByParticipantId === myParticipant.id;
  const isOwnSplit = participantId === myParticipant.id;

  if (!isCreditor && !isOwnSplit) {
    return NextResponse.json({ error: "No tienes permiso para modificar este split" }, { status: 403 });
  }

  const newPaid = !split.paid;

  // After toggling, check if all debtors (non-payer) are paid → auto disable/enable
  const debtorSplits = expense.participants.filter(
    (p) => p.participantId !== expense.paidByParticipantId,
  );
  const allPaidAfterToggle = debtorSplits.every((p) =>
    p.id === split.id ? newPaid : p.paid,
  );

  await prisma.$transaction([
    prisma.expenseParticipant.update({
      where: { id: split.id },
      data: { paid: newPaid },
    }),
    prisma.expense.update({
      where: { id: expenseId },
      data: { isActive: !allPaidAfterToggle },
    }),
  ]);

  return NextResponse.json({ paid: newPaid });
}
