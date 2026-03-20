import { prisma } from "@/lib/prisma";
import { calculateSettlement } from "@/lib/settlement";
import { ExpenseCard } from "@/components/expense-card";
import { MySettlementBanner } from "@/components/my-settlement-banner";
import { ConvertedAmount } from "@/components/ui/converted-amount";
import { ExpenseStatsCard } from "@/components/expense-stats-card";
import { ExpenseSettlementPanel } from "@/components/expense-settlement-panel";
import { CreateExpenseForm } from "@/components/create-expense-form";

type Participant = { id: string; name: string };

export async function ExpenseList({
  tripId,
  participants,
  defaultCurrency,
  canEdit,
  myParticipantId,
  myUserId,
  isAdmin,
}: {
  tripId: string;
  participants: Participant[];
  defaultCurrency: string;
  canEdit: boolean;
  myParticipantId: string;
  myUserId: string;
  isAdmin: boolean;
}) {
  const [rawExpenses, rawPayments] = await Promise.all([
    prisma.expense.findMany({
      where: { tripId },
      select: {
        id: true,
        description: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        receiptUrl: true,
        expenseDate: true,
        splitType: true,
        category: true,
        isActive: true,
        createdById: true,
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
              select: {
                participant: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { expenseDate: "desc" },
    }),
    prisma.payment.findMany({
      where: { tripId },
      select: {
        id: true,
        amount: true,
        currency: true,
        paidAt: true,
        fromParticipant: { select: { id: true, name: true } },
        toParticipant: { select: { id: true, name: true } },
      },
      orderBy: { paidAt: "desc" },
    }),
  ]);

  // Only active expenses count for settlement
  const activeExpenses = rawExpenses.filter((e) => e.isActive);

  const expensesForSettlement = activeExpenses.map((e) => ({
    id: e.id,
    amount: e.amount,
    currency: e.currency,
    paidByParticipantId: e.paidBy?.id ?? null,
    participants: e.participants.map((ep) => ({
      participantId: ep.participantId,
      amount: ep.amount,
    })),
  }));

  const paymentsForSettlement = rawPayments.map((p) => ({
    id: p.id,
    fromParticipantId: p.fromParticipant.id,
    toParticipantId: p.toParticipant.id,
    amount: p.amount,
    currency: p.currency,
  }));

  // Paid splits count as implicit payments from debtor → payer
  const paidSplitPayments = activeExpenses
    .filter((e) => e.paidBy)
    .flatMap((e) =>
      e.participants
        .filter((ep) => ep.paid && ep.participantId !== e.paidBy!.id)
        .map((ep) => ({
          id: `split-${e.id}-${ep.participantId}`,
          fromParticipantId: ep.participantId,
          toParticipantId: e.paidBy!.id,
          amount: ep.amount,
          currency: e.currency,
        })),
    );

  const participantsForSettlement = participants.map((p) => ({ id: p.id, name: p.name }));

  const { settlements } = calculateSettlement(
    expensesForSettlement,
    participantsForSettlement,
    [...paymentsForSettlement, ...paidSplitPayments],
  );

  const mySettlements = settlements.filter(
    (s) => s.fromId === myParticipantId || s.toId === myParticipantId,
  );

  const expenseTotals = activeExpenses.map((e) => ({ amount: e.amount, currency: e.currency }));
  const myShares = activeExpenses.flatMap((e) =>
    e.participants
      .filter((ep) => ep.participantId === myParticipantId)
      .map((ep) => ({ amount: ep.amount, currency: e.currency })),
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
      {/* Left column */}
      <div id="tutorial-settlement" className="flex flex-col gap-4 lg:sticky lg:top-24">
        <ExpenseStatsCard
          expenseTotals={expenseTotals}
          myShares={myShares}
          mySettlements={mySettlements}
          myParticipantId={myParticipantId}
          activeCount={activeExpenses.length}
          participantCount={participants.length}
        />
        <MySettlementBanner
          settlements={mySettlements}
          myParticipantId={myParticipantId}
        />
        <ExpenseSettlementPanel
          settlements={settlements}
          isAdmin={isAdmin}
          tripId={tripId}
          participants={participants}
          defaultCurrency={defaultCurrency}
        />
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-4">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-[.06em] text-zinc-400 dark:text-zinc-500">
            Gastos · {rawExpenses.length}
          </h3>
          {canEdit && (
            <div id="tutorial-create-expense">
              <CreateExpenseForm
                tripId={tripId}
                participants={participants}
                defaultCurrency={defaultCurrency}
              />
            </div>
          )}
        </div>

        {rawExpenses.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 py-8 text-center">
            Sin gastos registrados aún.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {rawExpenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                tripId={tripId}
                canEdit={canEdit}
                isCreator={expense.createdById === myUserId}
                isAdmin={isAdmin}
                myParticipantId={myParticipantId}
                tripParticipants={participants}
              />
            ))}
          </div>
        )}

        {rawPayments.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[.06em] text-zinc-400 dark:text-zinc-500">
              Pagos registrados · {rawPayments.length}
            </h3>
            <div className="flex flex-col gap-2">
              {rawPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 dark:border-[#2d2d31] bg-white dark:bg-[#1f2023] px-4 py-3"
                >
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <span className="font-semibold text-zinc-700 truncate dark:text-zinc-300">
                      {payment.fromParticipant.name}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-600 shrink-0">→</span>
                    <span className="font-semibold text-zinc-700 truncate dark:text-zinc-300">
                      {payment.toParticipant.name}
                    </span>
                    <span className="text-xs text-zinc-400 shrink-0 dark:text-zinc-500">
                      · {new Date(payment.paidAt).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    <ConvertedAmount amount={payment.amount} currency={payment.currency} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
