"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCY_SYMBOLS, fmtAmount } from "@/lib/constants";
import type { Currency } from "@/lib/constants";
import { toast } from "sonner";
import { ConvertedAmount } from "@/components/ui/converted-amount";
import { getCategoryEmoji } from "@/modules/expenses/lib/expense-categories";
import { ReceiptButton } from "@/modules/expenses/components/receipt-button";
import { EditExpenseForm } from "@/modules/expenses/components/edit-expense-form";
import type { EditExpenseData } from "@/modules/expenses/components/edit-expense-form";

type Participant = { id: string; name: string };

type ExpenseParticipantRow = {
  participantId: string;
  amount: number;
  paid: boolean;
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
  paymentMethod: string;
  receiptUrl: string | null;
  expenseDate: Date;
  splitType: string;
  category: string;
  isActive: boolean;
  createdById: string;
  paidBy: { id: string; name: string } | null;
  participants: ExpenseParticipantRow[];
  items: ExpenseItemRow[];
};

export function ExpenseCard({
  expense,
  tripId,
  canEdit,
  isCreator = false,
  isAdmin = false,
  myParticipantId = "",
  tripParticipants = [],
}: {
  expense: ExpenseCardData;
  tripId: string;
  canEdit: boolean;
  isCreator?: boolean;
  isAdmin?: boolean;
  myParticipantId?: string;
  tripParticipants?: Participant[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [togglingPaid, setTogglingPaid] = useState<string | null>(null);

  const isItemized = expense.splitType === "ITEMIZED";
  const hasPaidSplits = expense.participants.some((ep) => ep.paid);
  const isCreditor = expense.paidBy?.id === myParticipantId;

  const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: "💵 Efectivo",
    DEBIT: "💳 Débito",
    CREDIT: "💳 Crédito",
  };

  const sym = (currency: string) => CURRENCY_SYMBOLS[currency as Currency] ?? currency;
  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("es-CL", { day: "numeric", month: "short" });

  // Build data for EditExpenseForm
  const editData: EditExpenseData = {
    id: expense.id,
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    paymentMethod: expense.paymentMethod,
    receiptUrl: expense.receiptUrl,
    expenseDate: expense.expenseDate,
    splitType: expense.splitType,
    category: expense.category,
    paidByParticipantId: expense.paidBy?.id ?? null,
    participants: expense.participants.map((ep) => ({
      participantId: ep.participantId,
      amount: ep.amount,
    })),
    items: expense.items.map((item) => ({
      description: item.description,
      amount: item.amount,
      participantIds: item.participants.map((ip) => ip.participant.id),
    })),
  };

  function handleDelete() {
    toast("¿Eliminar este gasto?", {
      position: "top-center",
      action: {
        label: "Eliminar",
        onClick: async () => {
          const res = await fetch(`/api/trips/${tripId}/expenses/${expense.id}`, { method: "DELETE" });
          if (res.ok || res.status === 204) {
            router.refresh();
            toast.success("Gasto eliminado");
          } else {
            const data = (await res.json()) as { error?: string };
            toast.error(data.error ?? "Error al eliminar el gasto");
          }
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  }

  async function togglePaid(participantId: string) {
    setTogglingPaid(participantId);
    try {
      const res = await fetch(
        `/api/trips/${tripId}/expenses/${expense.id}/splits/${participantId}`,
        { method: "PATCH" },
      );
      if (res.ok) {
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Error al actualizar el pago");
      }
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setTogglingPaid(null);
    }
  }

  // Debtors are participants who are NOT the payer
  const debtors = expense.participants.filter(
    (ep) => ep.participantId !== expense.paidBy?.id,
  );

  // Can toggle paid for a given split
  function canTogglePaid(splitParticipantId: string) {
    if (isCreditor) return true; // payer can toggle anyone
    return splitParticipantId === myParticipantId; // debtor can toggle own
  }

  return (
    <div
      className={`group rounded-2xl border shadow-sm ring-1 overflow-hidden transition-all ${
        expense.isActive
          ? "border-zinc-100 bg-white ring-black/3 hover:shadow-md hover:border-zinc-200 dark:border-[#2d2d31] dark:bg-[#1f2023] dark:ring-white/3 dark:hover:border-[#3f3f46]"
          : "border-zinc-200 bg-zinc-50 ring-black/2 dark:border-[#2d2d31] dark:bg-[#18191c] dark:ring-white/3 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex-1 min-w-0">
          {/* Title + date + badges */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">{getCategoryEmoji(expense.category)}</span>
              <p className="font-semibold text-zinc-900 text-sm leading-snug dark:text-zinc-100 truncate">
                {expense.description}
              </p>
              {!expense.isActive && (
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  Liquidado
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isItemized && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  por ítems
                </span>
              )}
              {expense.paymentMethod && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                  {PAYMENT_METHOD_LABELS[expense.paymentMethod] ?? expense.paymentMethod}
                </span>
              )}
              {expense.receiptUrl && (
                <ReceiptButton
                  url={expense.receiptUrl}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 transition-colors dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600"
                />
              )}
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                {fmtDate(expense.expenseDate)}
              </span>
              {isCreator && canEdit && expense.isActive && !hasPaidSplits && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <EditExpenseForm
                    tripId={tripId}
                    expense={editData}
                    participants={tripParticipants}
                  />
                  <button
                    onClick={handleDelete}
                    className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-red-500 transition-colors dark:hover:bg-zinc-700"
                    aria-label="Eliminar gasto"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <p className="text-2xl font-black tracking-tight tabular-nums text-zinc-900 leading-none mb-2 dark:text-zinc-100">
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

          {/* 1 — Liquidación: debtors */}
          {expense.paidBy && debtors.length > 0 && (
            <div className="mt-3 flex flex-col gap-1">
              {debtors.map((ep) => {
                const canToggle = canTogglePaid(ep.participantId);
                const isLoading = togglingPaid === ep.participantId;
                return (
                  <div
                    key={ep.participantId}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                      ep.paid
                        ? "bg-emerald-50 dark:bg-emerald-500/5"
                        : "bg-zinc-50 dark:bg-[#27272a]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {ep.paid ? (
                        <span className="text-emerald-500 text-xs">✓</span>
                      ) : (
                        <span className="text-zinc-300 text-xs dark:text-zinc-600">○</span>
                      )}
                      <span className={`text-xs font-medium ${ep.paid ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-600 dark:text-zinc-400"}`}>
                        {ep.participant.name}
                      </span>
                      <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-500">
                        {sym(expense.currency)}{fmtAmount(ep.amount, expense.currency)}
                      </span>
                    </div>
                    {canToggle && (
                      <button
                        onClick={() => togglePaid(ep.participantId)}
                        disabled={isLoading}
                        className={`text-xs font-medium transition-colors disabled:opacity-50 ${
                          ep.paid
                            ? "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                            : "text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
                        }`}
                      >
                        {isLoading ? "..." : ep.paid ? "Quitar pagado" : "Marcar pagado"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 2 — Desglose de ítems (collapsible, solo itemized) */}
          {isItemized && expense.items.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
              >
                <span className={`inline-block transition-transform ${expanded ? "rotate-90" : ""}`}>▶</span>
                {expanded ? "Ocultar" : "Ver"} desglose · {expense.items.length} ítems
              </button>

              {expanded && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {expense.items.map((item) => (
                    <div key={item.id} className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2 dark:bg-[#27272a] dark:border-[#3f3f46]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{item.description}</span>
                        <span className="text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                          <ConvertedAmount amount={item.amount} currency={expense.currency} />
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.participants.map(({ participant }) => (
                          <span key={participant.id} className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-600 dark:text-zinc-300">
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

          {/* 3 — Total por persona (todos los participantes) */}
          {expense.participants.length > 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-[#2d2d31]">
              <p className="text-[10px] font-bold uppercase tracking-[.06em] text-zinc-400 dark:text-zinc-500 mb-2">
                Total por persona
              </p>
              <div className="flex flex-col gap-1">
                {expense.participants.map((ep) => (
                  <div key={ep.participantId} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{ep.participant.name}</span>
                    <span className="text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                      {sym(expense.currency)}{fmtAmount(ep.amount, expense.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
