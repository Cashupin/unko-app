import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ─── POST /api/items/[id]/reset-votes ─────────────────────────────────────────
//
// Admin-only. Resets all votes on a resolved item back to PENDING so that all
// current trip participants can vote again. The creator's implicit APPROVE is
// re-registered, consistent with the item creation flow.

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: itemId } = await params;
  const userId = session.user.id;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, tripId: true, status: true, createdById: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  }

  // Only admins of the trip can reset votes
  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId: item.tripId, userId },
    select: { role: true },
  });

  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un admin puede reiniciar la votación" }, { status: 403 });
  }

  if (item.status === "PENDING") {
    return NextResponse.json({ error: "El ítem ya está en votación" }, { status: 409 });
  }

  const output = await prisma.$transaction(async (tx) => {
    // 1. Delete all existing votes
    await tx.vote.deleteMany({ where: { itemId } });

    // 2. Re-register creator's implicit APPROVE vote
    await tx.vote.create({
      data: { userId: item.createdById, itemId, value: "APPROVE" },
    });

    // 3. Check if single vote already meets threshold (solo trip)
    const registeredParticipants = await tx.tripParticipant.count({
      where: { tripId: item.tripId, type: "REGISTERED", user: { status: "ACTIVE" } },
    });
    const threshold = Math.floor(registeredParticipants / 2) + 1;

    const newStatus = threshold === 1 ? "APPROVED" : "PENDING";

    // 4. Reset item status
    const updated = await tx.item.update({
      where: { id: itemId },
      data: { status: newStatus },
      select: { id: true, status: true, title: true },
    });

    return { item: updated, registeredParticipants, threshold };
  });

  logger.info("vote.reset", {
    itemId,
    resetBy: userId,
    previousStatus: item.status,
    newStatus: output.item.status,
    registeredParticipants: output.registeredParticipants,
  });

  return NextResponse.json(output.item);
}
