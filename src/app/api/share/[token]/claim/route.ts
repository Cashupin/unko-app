import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const claimSchema = z.object({
  claimerName: z.string().trim().min(1),
  items: z.array(z.object({
    id: z.string(),
    qty: z.number().int().positive(),
  })).min(1),
});

function getBaseName(description: string): string {
  const match = description.match(/^\d+ x (.+)$/);
  return match ? match[1] : description;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = claimSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { claimerName, items: claimedItems } = result.data;
  const claimedItemIds = claimedItems.map((i) => i.id);

  const expense = await prisma.expense.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      trip: {
        select: {
          id: true,
          participants: {
            where: { type: "GHOST", name: claimerName },
            select: { id: true },
          },
        },
      },
      items: {
        where: { id: { in: claimedItemIds } },
        select: {
          id: true,
          description: true,
          amount: true,
          itemQty: true,
          groupKey: true,
          groupQty: true,
          participants: { select: { participantId: true } },
        },
      },
    },
  });

  if (!expense) {
    return NextResponse.json({ error: "Link inválido" }, { status: 404 });
  }

  if (expense.items.length !== claimedItemIds.length) {
    return NextResponse.json({ error: "Algunos ítems no existen" }, { status: 400 });
  }

  // Conflict: any item already has a participant
  const conflictItems = expense.items.filter((item) => item.participants.length > 0);
  if (conflictItems.length > 0) {
    return NextResponse.json(
      { error: "Algunos ítems ya fueron reclamados. Recarga la página.", conflict: true },
      { status: 409 },
    );
  }

  // Validate claimed quantities
  for (const claimed of claimedItems) {
    const item = expense.items.find((i) => i.id === claimed.id)!;
    const maxQty = item.itemQty ?? 1;
    if (claimed.qty > maxQty) {
      return NextResponse.json(
        { error: `Cantidad inválida para "${item.description}"` },
        { status: 400 },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    // Resolve or create claimer
    let claimerId = expense.trip.participants[0]?.id;
    if (!claimerId) {
      const newParticipant = await tx.tripParticipant.create({
        data: { tripId: expense.trip.id, name: claimerName, type: "GHOST", role: "VIEWER" },
        select: { id: true },
      });
      claimerId = newParticipant.id;
    }

    let totalClaimed = 0;

    for (const claimed of claimedItems) {
      const item = expense.items.find((i) => i.id === claimed.id)!;
      const maxQty = item.itemQty ?? 1;
      const unitPrice = item.amount / maxQty;
      const claimedAmount = Math.round(unitPrice * claimed.qty * 100) / 100;
      const remainingQty = maxQty - claimed.qty;

      totalClaimed += claimedAmount;

      if (remainingQty === 0) {
        // Assign the whole item to claimer
        await tx.expenseItemParticipant.create({
          data: { expenseItemId: item.id, participantId: claimerId },
        });
      } else {
        // Split: delete original, create claimed portion + remaining portion
        await tx.expenseItem.delete({ where: { id: item.id } });

        const baseName = getBaseName(item.description);

        const claimedItem = await tx.expenseItem.create({
          data: {
            expenseId: expense.id,
            description: `${claimed.qty} x ${baseName}`,
            amount: claimedAmount,
            groupKey: item.groupKey,
            groupQty: item.groupQty,
            itemQty: claimed.qty,
          },
          select: { id: true },
        });
        await tx.expenseItemParticipant.create({
          data: { expenseItemId: claimedItem.id, participantId: claimerId },
        });

        // Remaining portion (unassigned)
        await tx.expenseItem.create({
          data: {
            expenseId: expense.id,
            description: `${remainingQty} x ${baseName}`,
            amount: Math.round((item.amount - claimedAmount) * 100) / 100,
            groupKey: item.groupKey,
            groupQty: item.groupQty,
            itemQty: remainingQty,
          },
        });
      }
    }

    // Upsert ExpenseParticipant
    const existing = await tx.expenseParticipant.findUnique({
      where: {
        expenseId_participantId: { expenseId: expense.id, participantId: claimerId },
      },
    });

    if (existing) {
      await tx.expenseParticipant.update({
        where: {
          expenseId_participantId: { expenseId: expense.id, participantId: claimerId },
        },
        data: { amount: existing.amount + totalClaimed },
      });
    } else {
      await tx.expenseParticipant.create({
        data: { expenseId: expense.id, participantId: claimerId, amount: totalClaimed },
      });
    }
  });

  return NextResponse.json({ success: true });
}
