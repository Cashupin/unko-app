"use client";

import { useState } from "react";
import { CURRENCY_SYMBOLS, fmtAmount } from "@/lib/constants";
import type { Currency } from "@/lib/constants";
import { DeleteExpenseButton } from "@/components/delete-expense-button";
import { ConvertedAmount } from "@/components/converted-amount";

type ExpenseParticipantRow = {
  amount: number;
  participant: { id: string; name: string };
};

type ExpenseItemRow = {
  id: string;
  description: string;
  amount: number;
  participants: { participant: { id: string; name: string } }[];
};

export type ExpenseCardData = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: Date;
  splitType: string;
  createdById: string;
  paidBy: { id: string; name: string } | null;
  participants: ExpenseParticipantRow[];
  items: ExpenseItemRow[];
};

export function ExpenseCard({
  expense,
  tripId,
  canEdit,
}: {
  expense: ExpenseCardData;
  tripId: string;
  canEdit: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isItemized = expense.splitType === "ITEMIZED";

  const sym = (currency: string) =>
    CURRENCY_SYMBOLS[currency as Currency] ?? currency;

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("es-CL", { day: "numeric", month: "short" });

  return (
    <div className="group rounded-2xl border border-zinc-100 bg-white shadow-sm ring-1 ring-black/3 hover:shadow-md hover:border-zinc-200 transition-all overflow-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:ring-white/5 dark:hover:border-zinc-700">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex-1 min-w-0">
          {/* Title + date */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="font-semibold text-zinc-900 text-sm leading-snug dark:text-zinc-100">
              {expense.description}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              {isItemized && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  por ítems
                </span>
              )}
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                {fmtDate(expense.expenseDate)}
              </span>
            </div>
          </div>

          {/* Amount */}
          <p className="text-xl font-bold tabular-nums text-zinc-900 leading-none mb-2 dark:text-zinc-100">
            <ConvertedAmount amount={expense.amount} currency={expense.currency} />
          </p>

          {/* Paid by */}
          {expense.paidBy && (
            <p className="text-xs text-zinc-500 mb-2 dark:text-zinc-400">
              Pagó{" "}
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {expense.paidBy.name}
              </span>
            </p>
          )}

          {/* Participant splits */}
          <div className="flex flex-wrap gap-1.5">
            {expense.participants.map((ep) => (
              <span
                key={ep.participant.id}
                className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:border-zinc-700 dark:text-zinc-400"
              >
                {ep.participant.name}
                <span className="ml-1 text-zinc-400 dark:text-zinc-500">
                  {sym(expense.currency)}
                  {fmtAmount(ep.amount, expense.currency)}
                </span>
              </span>
            ))}
          </div>

          {/* ITEMIZED: expandable item breakdown */}
          {isItemized && expense.items.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
              >
                <span
                  className={`inline-block transition-transform ${expanded ? "rotate-90" : ""}`}
                >
                  ▶
                </span>
                {expanded ? "Ocultar" : "Ver"} desglose de ítems
              </button>

              {expanded && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {expense.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2 dark:bg-zinc-700/50 dark:border-zinc-700"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          {item.description}
                        </span>
                        <span className="text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                          <ConvertedAmount amount={item.amount} currency={expense.currency} />
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.participants.map(({ participant }) => (
                          <span
                            key={participant.id}
                            className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-600 dark:text-zinc-300"
                          >
                            {participant.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {canEdit && (
          <div className="shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <DeleteExpenseButton tripId={tripId} expenseId={expense.id} />
          </div>
        )}
      </div>
    </div>
  );
}
