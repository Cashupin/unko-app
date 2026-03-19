"use client";

import { useState } from "react";
import { CURRENCY_SYMBOLS, fmtAmount } from "@/lib/constants";
import type { Currency } from "@/lib/constants";
import { ExpenseDrawer } from "@/components/expense-drawer";
import type { StandaloneExpenseData } from "@/modules/dashboard/components/standalone-expense-card";

function ExpenseRow({
  expense,
  onClick,
}: {
  expense: StandaloneExpenseData;
  onClick: () => void;
}) {
  const sym = (c: string) => CURRENCY_SYMBOLS[c as Currency] ?? c;

  const pendingSettlements = expense.settlement.filter((s) => {
    const debtorSplit = expense.participants.find((ep) => ep.participant.name === s.fromName);
    return !debtorSplit?.paid;
  });

  const allPaid = expense.settlement.length > 0 && pendingSettlements.length === 0;

  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString("es-CL", { day: "numeric", month: "short" });

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-zinc-100 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/60 px-4 py-3.5 flex items-center justify-between gap-3 hover:border-zinc-200 dark:hover:border-zinc-600 hover:shadow-sm transition-all"
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">
          {expense.description}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {expense.expenseDate && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{fmt(expense.expenseDate)}</span>
          )}
          {expense.paidBy && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">· {expense.paidBy.name}</span>
          )}
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
              expense.splitType === "ITEMIZED"
                ? "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400"
                : "bg-zinc-100 dark:bg-zinc-700/60 text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {expense.splitType === "ITEMIZED" ? "Itemizado" : "Igualitario"}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
          {sym(expense.currency)}{fmtAmount(expense.amount, expense.currency)}
        </span>
        {expense.settlement.length > 0 && (
          <span
            className={`text-xs font-medium ${
              allPaid
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-500 dark:text-amber-400"
            }`}
          >
            {allPaid ? "Liquidado" : `${pendingSettlements.length} pendiente${pendingSettlements.length !== 1 ? "s" : ""}`}
          </span>
        )}
      </div>
    </button>
  );
}

export function DashboardExpenses({ expenses }: { expenses: StandaloneExpenseData[] }) {
  const [selected, setSelected] = useState<StandaloneExpenseData | null>(null);

  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 p-10 text-center">
        <p className="text-sm text-zinc-400 dark:text-zinc-500">Sin gastos independientes aún.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {expenses.map((expense) => (
          <ExpenseRow key={expense.id} expense={expense} onClick={() => setSelected(expense)} />
        ))}
      </div>

      {selected && (
        <ExpenseDrawer expense={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
