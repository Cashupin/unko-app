import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

// POST /api/trips/[id]/expenses/[expenseId]/settle
// Marks all pending debtor splits as paid and deactivates the expense.
// Requires the caller to be the payer (creditor) or an admin.

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tripId, expenseId } = await params;

  const [myParticipant, expense] = await Promise.all([
    prisma.tripParticipant.findFirst({
      where: { tripId, userId: session.user.id },
      select: { id: true, role: true },
    }),
    prisma.expense.findFirst({
      where: { id: expenseId, tripId, isActive: true },
      select: {
        paidByParticipantId: true,
        participants: { select: { id: true, participantId: true, paid: true } },
      },
    }),
  ]);

  if (!myParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!expense) return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });

  const isCreditor = expense.paidByParticipantId === myParticipant.id;
  const isAdmin = myParticipant.role === "ADMIN";
  if (!isCreditor && !isAdmin) {
    return NextResponse.json({ error: "Solo el pagador o un admin puede saldar este gasto" }, { status: 403 });
  }

  const unpaidSplits = expense.participants.filter(
    (ep) => ep.participantId !== expense.paidByParticipantId && !ep.paid,
  );

  if (unpaidSplits.length === 0) {
    return NextResponse.json({ message: "Ya estaba saldado" });
  }

  await prisma.$transaction([
    prisma.expenseParticipant.updateMany({
      where: { id: { in: unpaidSplits.map((s) => s.id) } },
      data: { paid: true },
    }),
    prisma.expense.update({
      where: { id: expenseId },
      data: { isActive: false },
    }),
  ]);

  broadcast(`trip:${tripId}`, "update");
  return NextResponse.json({ settled: true });
}
