import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ShareExpenseClaim } from "@/components/share-expense-claim";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const raw = await prisma.expense.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      description: true,
      amount: true,
      currency: true,
      receiptUrl: true,
      expenseDate: true,
      paidBy: { select: { name: true } },
      trip: {
        select: {
          participants: {
            where: { type: "GHOST" },
            select: { id: true, name: true },
            orderBy: { joinedAt: "asc" },
          },
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
          itemQty: true,
          groupKey: true,
          groupQty: true,
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!raw) notFound();

  const expense = {
    id: raw.id,
    description: raw.description,
    amount: raw.amount,
    currency: raw.currency,
    receiptUrl: raw.receiptUrl,
    expenseDate: raw.expenseDate.toISOString(),
    paidBy: raw.paidBy,
    participants: raw.trip.participants,
    items: raw.items.map((item) => ({
      id: item.id,
      description: item.description,
      amount: item.amount,
      itemQty: item.itemQty,
      assignedTo: item.participants.map((p) => p.participant),
    })),
  };

  return <ShareExpenseClaim expense={expense} token={token} />;
}
