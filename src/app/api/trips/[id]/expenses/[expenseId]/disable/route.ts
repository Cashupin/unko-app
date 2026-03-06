import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/trips/[id]/expenses/[expenseId]/disable — toggle isActive

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId, expenseId } = await params;

  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId, userId: session.user.id },
    select: { role: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, tripId },
    select: { id: true, createdById: true, isActive: true },
  });
  if (!expense) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
  }
  if (expense.createdById !== session.user.id && membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: { isActive: !expense.isActive },
    select: { id: true, isActive: true },
  });
  return NextResponse.json(updated);
}
