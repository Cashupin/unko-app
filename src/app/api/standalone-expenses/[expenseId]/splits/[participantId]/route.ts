import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function verifyOwnership(expenseId: string, userId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: {
      trip: { select: { isStandaloneGroup: true, createdById: true } },
    },
  });
  if (!expense?.trip?.isStandaloneGroup) return false;
  return expense.trip.createdById === userId;
}

// PATCH /api/standalone-expenses/[expenseId]/splits/[participantId]
// Toggles the `paid` field on an ExpenseParticipant row.

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ expenseId: string; participantId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { expenseId, participantId } = await params;

  const isOwner = await verifyOwnership(expenseId, session.user.id);
  if (!isOwner) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const split = await prisma.expenseParticipant.findUnique({
    where: { expenseId_participantId: { expenseId, participantId } },
    select: { paid: true },
  });

  if (!split) {
    return NextResponse.json({ error: "Split no encontrado" }, { status: 404 });
  }

  const updated = await prisma.expenseParticipant.update({
    where: { expenseId_participantId: { expenseId, participantId } },
    data: { paid: !split.paid },
    select: { paid: true },
  });

  return NextResponse.json(updated);
}
