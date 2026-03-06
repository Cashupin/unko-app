import { prisma } from "@/lib/prisma";
import { calculateSettlement } from "@/lib/settlement";
import { CreatePaymentForm } from "@/components/create-payment-form";
import { ExpenseCard } from "@/components/expense-card";
import { MySettlementBanner } from "@/components/my-settlement-banner";
import { ConvertedAmount } from "@/components/converted-amount";

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
        expenseDate: true,
        splitType: true,
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

  return (
    <div className="flex flex-col gap-6">
      {/* ── Mi liquidación ────────────────────────────────────────────────── */}
      <MySettlementBanner
        settlements={mySettlements}
        myParticipantId={myParticipantId}
      />

      {/* ── Liquidación general ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm ring-1 ring-black/3 overflow-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:ring-white/5">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-700">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Liquidación general</h3>
          {isAdmin && (
            <CreatePaymentForm
              tripId={tripId}
              participants={participants}
              defaultCurrency={defaultCurrency}
            />
          )}
        </div>

        <div className="px-5 py-4">
          {settlements.length === 0 ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              {rawExpenses.length === 0
                ? "Sin gastos registrados aún."
                : "¡Todo al día! No hay transferencias pendientes."}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {Array.from(
                settlements.reduce((map, s) => {
                  if (!map.has(s.fromId)) map.set(s.fromId, { name: s.fromName, items: [] });
                  map.get(s.fromId)!.items.push(s);
                  return map;
                }, new Map<string, { name: string; items: typeof settlements }>()),
              ).map(([fromId, group]) => (
                <div key={fromId}>
                  <p className="mb-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {group.name} debe
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {group.items.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-2.5 dark:bg-zinc-700/40 dark:border-zinc-700"
                      >
                        <div className="flex items-center gap-2 text-sm min-w-0">
                          <span className="text-zinc-300 dark:text-zinc-600 shrink-0">→</span>
                          <span className="font-semibold text-zinc-700 truncate dark:text-zinc-300">{s.toName}</span>
                        </div>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-200">
                          <ConvertedAmount amount={s.amount} currency={s.currency} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Expense list ─────────────────────────────────────────────────── */}
      {rawExpenses.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Gastos · {rawExpenses.length}
          </h3>
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
        </div>
      )}

      {/* ── Payments list ────────────────────────────────────────────────── */}
      {rawPayments.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Pagos registrados · {rawPayments.length}
          </h3>
          <div className="flex flex-col gap-2">
            {rawPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
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
  );
}
