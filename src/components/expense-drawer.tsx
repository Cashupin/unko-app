"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CURRENCY_SYMBOLS, fmtAmount } from "@/lib/constants";
import type { Currency } from "@/lib/constants";
import { ConvertedAmount } from "@/components/ui/converted-amount";
import { useCurrency } from "@/providers/currency-provider";
import { ReceiptButton } from "@/components/receipt-button";
import { StandaloneExpenseForm } from "@/modules/dashboard/components/standalone-expense-form";
import type { StandaloneInitialValues } from "@/modules/dashboard/components/standalone-expense-form";
import type { StandaloneExpenseData } from "@/modules/dashboard/components/standalone-expense-card";

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
    receiptUrl: expense.receiptUrl ?? null,
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
    lines.push("", "Ítems:");
    for (const item of expense.items) {
      const names = item.participants.map((p) => p.participant.name).join(", ");
      lines.push(`  ${item.description} (${names})   ${fmtWithConversion(item.amount)}`);
    }
  }
  if (expense.participants.length > 0) {
    lines.push("", "Desglose:");
    for (const ep of expense.participants) {
      lines.push(`  ${ep.participant.name}   ${fmtWithConversion(ep.amount)}`);
    }
  }
  if (expense.settlement.length > 0) {
    lines.push("", "Liquidación:");
    for (const s of expense.settlement) {
      lines.push(`  ${s.fromName} → ${s.toName}   ${fmtWithConversion(s.amount, s.currency)}`);
    }
  }
  if (expense.expenseDate) {
    lines.push("", new Date(expense.expenseDate).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" }));
  }
  return lines.join("\n");
}

export function ExpenseDrawer({
  expense,
  onClose,
}: {
  expense: StandaloneExpenseData;
  onClose: () => void;
}) {
  const router = useRouter();
  const { displayCurrency, convert } = useCurrency();
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingPaid, setTogglingPaid] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 10);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, []);

  function handleClose() {
    setShow(false);
    setTimeout(onClose, 300);
  }

  async function togglePaid(participantId: string) {
    setTogglingPaid(participantId);
    try {
      const res = await fetch(`/api/standalone-expenses/${expense.id}/splits/${participantId}`, { method: "PATCH" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Error al actualizar");
      }
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setTogglingPaid(null);
    }
  }

  async function handleShare() {
    try {
      const res = await fetch(`/api/standalone-expenses/${expense.id}/share`, { method: "POST" });
      if (!res.ok) { toast.error("No se pudo generar el link"); return; }
      const { token } = (await res.json()) as { token: string };
      const url = `${window.location.origin}/share/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado al portapapeles");
    } catch {
      toast.error("Error al generar el link");
    }
  }

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
      const res = await fetch(`/api/standalone-expenses/${expense.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("No se pudo eliminar el gasto"); setDeleting(false); return; }
      handleClose();
      router.refresh();
      toast.success("Gasto eliminado");
    } catch {
      toast.error("Error de red");
      setDeleting(false);
    }
  }

  const sym = (c: string) => CURRENCY_SYMBOLS[c as Currency] ?? c;

  const splitLabel = expense.splitType === "ITEMIZED" ? "Itemizado" : "Igualitario";

  const content = (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-700/60 shrink-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
            {expense.description}
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {expense.expenseDate && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {new Date(expense.expenseDate).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
            {expense.paidBy && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">· Pagó {expense.paidBy.name}</span>
            )}
            <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-700/60 rounded-md px-1.5 py-0.5">
              {splitLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {sym(expense.currency)}{fmtAmount(expense.amount, expense.currency)}
          </span>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* Settlement */}
        {expense.settlement.length > 0 && (
          <div className="px-5 py-4 bg-zinc-50 dark:bg-zinc-700/20 border-b border-zinc-100 dark:border-zinc-700/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">Liquidación</p>
            <div className="flex flex-col gap-2">
              {expense.settlement.map((s, i) => {
                const debtorSplit = expense.participants.find((ep) => ep.participant.name === s.fromName);
                const isLoading = togglingPaid === debtorSplit?.participantId;
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${debtorSplit?.paid ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-white dark:bg-zinc-800/60"}`}
                  >
                    <div className="flex items-center gap-1.5 text-xs min-w-0">
                      {debtorSplit?.paid
                        ? <span className="text-emerald-500 shrink-0">✓</span>
                        : <span className="text-zinc-300 dark:text-zinc-600 shrink-0">○</span>
                      }
                      <span className={`font-semibold truncate ${debtorSplit?.paid ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                        {s.fromName}
                      </span>
                      <span className="text-zinc-300 dark:text-zinc-600 shrink-0">→</span>
                      <span className={`font-semibold truncate ${debtorSplit?.paid ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                        {s.toName}
                      </span>
                      <span className={`tabular-nums shrink-0 ${debtorSplit?.paid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                        <ConvertedAmount amount={s.amount} currency={s.currency} />
                      </span>
                    </div>
                    {debtorSplit && (
                      <button
                        onClick={() => togglePaid(debtorSplit.participantId)}
                        disabled={isLoading}
                        className={`text-xs font-medium transition-colors disabled:opacity-50 ml-2 shrink-0 ${debtorSplit.paid ? "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300" : "text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"}`}
                      >
                        {isLoading ? "..." : debtorSplit.paid ? "Anular" : "Pagado"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Items (ITEMIZED) */}
        {expense.splitType === "ITEMIZED" && expense.items.length > 0 && (
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-700/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">Ítems</p>
            <div className="flex flex-col gap-3">
              {expense.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{item.description}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {item.participants.map((p) => p.participant.name).join(", ") || "Sin asignar"}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 tabular-nums shrink-0">
                    {sym(expense.currency)}{fmtAmount(item.amount, expense.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Desglose (EQUAL split) */}
        {expense.splitType !== "ITEMIZED" && expense.participants.length > 0 && (
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-700/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">Desglose</p>
            <div className="flex flex-col gap-2">
              {expense.participants.map((ep) => (
                <div key={ep.participantId} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{ep.participant.name}</span>
                  <span className="text-sm font-medium tabular-nums text-zinc-600 dark:text-zinc-300">
                    {sym(expense.currency)}{fmtAmount(ep.amount, expense.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Actions */}
      <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-700/60 px-5 py-4 flex items-center justify-between bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            Editar
          </button>
          <button
            onClick={handleCopy}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            Copiar
          </button>
          {expense.splitType === "ITEMIZED" && (
            <button
              onClick={handleShare}
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              Compartir
            </button>
          )}
          {expense.receiptUrl && (
            <ReceiptButton
              url={expense.receiptUrl}
              label="Boleta"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            />
          )}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm font-medium text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
        >
          {deleting ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />

      {/* Desktop: right panel */}
      <div
        className={`fixed right-0 top-0 h-full z-50 w-[480px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-700 shadow-2xl flex-col transition-transform duration-300 hidden md:flex ${show ? "translate-x-0" : "translate-x-full"}`}
      >
        {content}
      </div>

      {/* Mobile: bottom sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 shadow-2xl flex-col max-h-[88vh] transition-transform duration-300 flex md:hidden ${show ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        </div>
        {content}
      </div>

      {editing && (
        <StandaloneExpenseForm
          mode="edit"
          initialValues={toInitialValues(expense)}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
