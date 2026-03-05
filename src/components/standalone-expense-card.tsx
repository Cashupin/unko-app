"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCY_SYMBOLS, fmtAmount } from "@/lib/constants";
import type { Currency } from "@/lib/constants";
import { ConvertedAmount } from "@/components/converted-amount";
import { useCurrency } from "@/components/currency-provider";
import { ExpenseCard } from "@/components/expense-card";
import type { ExpenseCardData } from "@/components/expense-card";
import { StandaloneExpenseForm } from "@/components/standalone-expense-form";
import type { StandaloneInitialValues } from "@/components/standalone-expense-form";
import { toast } from "sonner";

type Settlement = { fromName: string; toName: string; amount: number; currency: string };

export type StandaloneExpenseData = ExpenseCardData & {
  trip: { id: string };
  settlement: Settlement[];
};

function toInitialValues(expense: StandaloneExpenseData): StandaloneInitialValues {
  const participantNames = expense.participants.map((ep) => ep.participant.name);

  const allNames = new Set(participantNames);
  if (expense.paidBy) allNames.add(expense.paidBy.name);
  if (expense.splitType === "ITEMIZED") {
    for (const item of expense.items) {
      for (const p of item.participants) allNames.add(p.participant.name);
    }
  }

  return {
    expenseId: expense.id,
    description: expense.description,
    currency: expense.currency,
    expenseDate: expense.expenseDate
      ? new Date(expense.expenseDate).toISOString().slice(0, 10)
      : "",
    splitType: expense.splitType as "EQUAL" | "ITEMIZED",
    amount: String(expense.amount),
    participants: Array.from(allNames),
    paidByName: expense.paidBy?.name ?? "",
    splitParticipantNames: participantNames,
    items: expense.items.map((item) => ({
      id: crypto.randomUUID(),
      description: item.description,
      amount: String(item.amount),
      participantNames: item.participants.map((p) => p.participant.name),
    })),
  };
}

function buildExportText(
  expense: StandaloneExpenseData,
  displayCurrency: string,
  convert: (amount: number, from: string) => number,
): string {
  const sym = (c: string) => CURRENCY_SYMBOLS[c as Currency] ?? c;

  const fmtWithConversion = (amount: number, currency = expense.currency) => {
    const original = `${sym(currency)} ${fmtAmount(amount, currency)}`;
    if (currency === displayCurrency) return original;
    const converted = convert(amount, currency);
    return `${original} → ${sym(displayCurrency)} ${fmtAmount(converted, displayCurrency)}`;
  };

  const lines: string[] = [];

  lines.push(`${expense.description} — ${fmtWithConversion(expense.amount)}`);
  if (expense.paidBy) lines.push(`Pagó: ${expense.paidBy.name}`);

  if (expense.splitType === "ITEMIZED" && expense.items.length > 0) {
    lines.push("");
    lines.push("Ítems:");
    for (const item of expense.items) {
      const names = item.participants.map((p) => p.participant.name).join(", ");
      lines.push(`  ${item.description} (${names})   ${fmtWithConversion(item.amount)}`);
    }
  }

  if (expense.participants.length > 0) {
    lines.push("");
    lines.push("Desglose:");
    for (const ep of expense.participants) {
      lines.push(`  ${ep.participant.name}   ${fmtWithConversion(ep.amount)}`);
    }
  }

  if (expense.settlement.length > 0) {
    lines.push("");
    lines.push("Liquidación:");
    for (const s of expense.settlement) {
      lines.push(`  ${s.fromName} → ${s.toName}   ${fmtWithConversion(s.amount, s.currency)}`);
    }
  }

  if (expense.expenseDate) {
    lines.push("");
    lines.push(
      new Date(expense.expenseDate).toLocaleDateString("es-CL", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    );
  }

  return lines.join("\n");
}

export function StandaloneExpenseCard({ expense }: { expense: StandaloneExpenseData }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const { displayCurrency, convert } = useCurrency();

  const sym = (c: string) => CURRENCY_SYMBOLS[c as Currency] ?? c;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildExportText(expense, displayCurrency, convert));
      toast.success("Copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar este gasto?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/standalone-expenses/${expense.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("No se pudo eliminar el gasto");
        return;
      }
      router.refresh();
      toast.success("Gasto eliminado");
    } catch {
      toast.error("Error de red");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-0 rounded-2xl border border-zinc-100 overflow-hidden shadow-sm ring-1 ring-black/3 dark:border-zinc-700 dark:ring-white/5">
      {/* Reuse ExpenseCard for the expense details + item breakdown */}
      <div className="[&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none [&>div]:ring-0">
        <ExpenseCard expense={expense} tripId={expense.trip.id} canEdit={false} />
      </div>

      {/* Settlement strip */}
      {expense.settlement.length > 0 && (
        <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-700/30">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Liquidación
          </p>
          <div className="flex flex-col gap-1">
            {expense.settlement.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {s.fromName}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-600">→</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {s.toName}
                  </span>
                </div>
                <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  <ConvertedAmount amount={s.amount} currency={s.currency} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-zinc-100 bg-white px-4 py-2 flex justify-between items-center dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            Editar
          </button>
          <button
            onClick={handleCopy}
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            Copiar
          </button>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-zinc-400 hover:text-red-500 disabled:opacity-50 transition-colors dark:text-zinc-500 dark:hover:text-red-400"
        >
          {deleting ? "Eliminando..." : "Eliminar"}
        </button>
      </div>

      {/* Edit form modal */}
      {editing && (
        <StandaloneExpenseForm
          mode="edit"
          initialValues={toInitialValues(expense)}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
