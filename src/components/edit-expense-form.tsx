"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCY_OPTIONS, CURRENCY_DECIMALS, fmtAmount } from "@/lib/constants";
import type { Currency } from "@/lib/constants";
import { DatePicker } from "@/components/ui/date-picker";
import { UploadPhoto } from "@/components/ui/upload-photo";
import { ReceiptButton } from "@/components/receipt-button";
import { ReceiptAiButton, type ParsedReceiptItem } from "@/components/receipt-ai-button";
import { toast } from "sonner";
import { CATEGORY_CONFIG, type ExpenseCategory } from "@/lib/expense-categories";

function fmtInput(raw: string, cur: string): string {
  if (!raw) return "";
  const decimals = CURRENCY_DECIMALS[cur as Currency] ?? 2;
  if (decimals === 0) {
    const n = parseInt(raw.replace(/\D/g, ""), 10);
    return isNaN(n) ? "" : n.toLocaleString("es-CL");
  }
  const [intPart, ...decParts] = raw.split(".");
  const intN = parseInt(intPart || "0", 10);
  const intFmt = isNaN(intN) ? "" : intN.toLocaleString("es-CL");
  const dec = decParts.join("").slice(0, decimals);
  return raw.includes(".") ? `${intFmt},${dec}` : intFmt;
}

function parseInputVal(input: string, cur: string): string {
  const decimals = CURRENCY_DECIMALS[cur as Currency] ?? 2;
  if (decimals === 0) return input.replace(/\D/g, "");
  return input.replace(/\./g, "").replace(",", ".");
}

type Participant = { id: string; name: string };

type ExpenseItemDraft = {
  id: string;
  description: string;
  amount: string;
  participantIds: string[];
  groupKey?: string;
  groupQty?: number;
  itemQty?: number;
};

function newItem(participants: Participant[]): ExpenseItemDraft {
  return {
    id: crypto.randomUUID(),
    description: "",
    amount: "",
    participantIds: participants.map((p) => p.id),
  };
}

export type EditExpenseData = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  receiptUrl: string | null;
  expenseDate: Date;
  splitType: string;
  category: string;
  paidByParticipantId: string | null;
  participants: { participantId: string; amount: number }[];
  items: {
    description: string;
    amount: number;
    participantIds: string[];
  }[];
};

export function EditExpenseForm({
  tripId,
  expense,
  participants,
}: {
  tripId: string;
  expense: EditExpenseData;
  participants: Participant[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const initialSplitMode = expense.splitType === "ITEMIZED" ? "ITEMIZED" : "EQUAL";
  const [splitMode, setSplitMode] = useState<"EQUAL" | "ITEMIZED">(initialSplitMode);
  const [currency, setCurrency] = useState(expense.currency);
  const [paymentMethod, setPaymentMethod] = useState(expense.paymentMethod ?? "CASH");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(expense.receiptUrl ?? null);
  const [amountValue, setAmountValue] = useState(String(expense.amount));

  const [category, setCategory] = useState<ExpenseCategory>((expense.category as ExpenseCategory) ?? "OTHER");

  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    expense.participants.map((ep) => ep.participantId),
  );

  const [items, setItems] = useState<ExpenseItemDraft[]>(() => {
    if (expense.items.length > 0) {
      return expense.items.map((item) => ({
        id: crypto.randomUUID(),
        description: item.description,
        amount: String(item.amount),
        participantIds: item.participantIds,
      }));
    }
    return [newItem(participants)];
  });

  function openModal() {
    setOpen(true);
  }
  function closeModal() {
    setOpen(false);
  }

  function toggleParticipant(id: string) {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function addItem() {
    setItems((prev) => [...prev, newItem(participants)]);
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }
  function updateItem(id: string, patch: Partial<Omit<ExpenseItemDraft, "id">>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }
  function toggleItemParticipant(itemId: string, participantId: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const pids = item.participantIds.includes(participantId)
          ? item.participantIds.filter((p) => p !== participantId)
          : [...item.participantIds, participantId];
        return { ...item, participantIds: pids };
      }),
    );
  }

  function applyAiItems(parsed: ParsedReceiptItem[]) {
    setSplitMode("ITEMIZED");
    setItems(
      parsed.map((p) => ({
        id: crypto.randomUUID(),
        description: p.description,
        amount: String(p.amount),
        participantIds:
          p.assignees.length > 0
            ? p.assignees
            : participants.map((pt) => pt.id),
        groupKey: p.groupKey,
        groupQty: p.groupQty,
        itemQty: p.itemQty,
      })),
    );
  }

  const perParticipantTotals = participants.map((p) => {
    const total = items.reduce((sum, item) => {
      if (!item.participantIds.includes(p.id)) return sum;
      const n = item.participantIds.length;
      const amt = parseFloat(item.amount) || 0;
      return sum + amt / n;
    }, 0);
    return { ...p, total };
  });
  const itemizedTotal = perParticipantTotals.reduce((s, p) => s + p.total, 0);

  const defaultDateStr = new Date(expense.expenseDate).toISOString().slice(0, 10);
  const defaultAmount = String(expense.amount);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    if (splitMode === "EQUAL") {
      if (selectedParticipants.length === 0) {
        toast.error("Debes seleccionar al menos un participante");
        return;
      }
      const amountNum = parseFloat(amountValue);
      if (!amountValue || isNaN(amountNum) || amountNum <= 0) {
        toast.error("El monto debe ser mayor a 0");
        return;
      }

      setLoading(true);
      const body = {
        splitType: "EQUAL",
        description: (fd.get("description") as string).trim(),
        amount: amountNum,
        currency: fd.get("currency") as string,
        paymentMethod,
        receiptUrl: receiptUrl ?? null,
        paidByParticipantId: (fd.get("paidBy") as string) || undefined,
        expenseDate: (fd.get("expenseDate") as string) || undefined,
        participantIds: selectedParticipants,
        category,
      };
      try {
        const res = await fetch(`/api/trips/${tripId}/expenses/${expense.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          toast.error(data.error ?? "Error al guardar el gasto");
          return;
        }
        closeModal();
        router.refresh();
        toast.success("Gasto actualizado");
      } catch {
        toast.error("Error de red. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // ITEMIZED
    if (items.length === 0) { toast.error("Agrega al menos un ítem"); return; }
    for (const item of items) {
      if (!item.description.trim()) { toast.error("Cada ítem debe tener una descripción"); return; }
      const amt = parseFloat(item.amount);
      if (!amt || amt <= 0) { toast.error("Cada ítem debe tener un monto mayor a 0"); return; }
      if (item.participantIds.length === 0) { toast.error("Cada ítem debe tener al menos un participante"); return; }
    }

    setLoading(true);
    const body = {
      splitType: "ITEMIZED",
      description: (fd.get("description") as string).trim(),
      currency: fd.get("currency") as string,
      paymentMethod,
      receiptUrl: receiptUrl ?? null,
      paidByParticipantId: (fd.get("paidBy") as string) || undefined,
      expenseDate: (fd.get("expenseDate") as string) || undefined,
      category,
      items: items.map((item) => ({
        description: item.description.trim(),
        amount: parseFloat(item.amount),
        participantIds: item.participantIds,
        groupKey: item.groupKey,
        groupQty: item.groupQty,
        itemQty: item.itemQty,
      })),
    };
    try {
      const res = await fetch(`/api/trips/${tripId}/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Error al guardar el gasto");
        return;
      }
      closeModal();
      router.refresh();
      toast.success("Gasto actualizado");
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        aria-label="Editar gasto"
        title="Editar gasto"
      >
        ✏️
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto dark:bg-zinc-800">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Editar gasto</h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300" aria-label="Cerrar">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Description */}
              <div className="flex flex-col gap-1">
                <label htmlFor="edit-expense-desc" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Descripción <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-expense-desc"
                  name="description"
                  type="text"
                  required
                  defaultValue={expense.description}
                  maxLength={500}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                />
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Categoría</span>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(CATEGORY_CONFIG) as [ExpenseCategory, { emoji: string; label: string }][]).map(
                    ([key, { emoji, label }]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCategory(key)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          category === key
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "border border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                        }`}
                      >
                        <span>{emoji}</span>
                        {label}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Split mode toggle */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Modo de división</span>
                <div className="flex rounded-lg border border-zinc-200 overflow-hidden dark:border-zinc-700">
                  <button type="button" onClick={() => setSplitMode("EQUAL")}
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${splitMode === "EQUAL" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-white text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"}`}>
                    División equitativa
                  </button>
                  <button type="button" onClick={() => { setSplitMode("ITEMIZED"); if (items.length === 0) setItems([newItem(participants)]); }}
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors border-l border-zinc-200 dark:border-zinc-700 ${splitMode === "ITEMIZED" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-white text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"}`}>
                    Por ítems
                  </button>
                </div>
              </div>

              {/* Payment method */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Tipo de pago</span>
                <div className="flex gap-2">
                  {[
                    { value: "CASH", label: "💵 Efectivo" },
                    { value: "DEBIT", label: "💳 Débito" },
                    { value: "CREDIT", label: "💳 Crédito" },
                  ].map((pm) => (
                    <button
                      key={pm.value}
                      type="button"
                      onClick={() => setPaymentMethod(pm.value)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        paymentMethod === pm.value
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "border border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Receipt photo */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Foto de boleta</span>
                {receiptUrl ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <ReceiptButton url={receiptUrl} label="🧾 Ver boleta" className="text-xs text-blue-600 hover:underline dark:text-blue-400" />
                      <button type="button" onClick={() => setReceiptUrl(null)} className="text-xs text-zinc-400 hover:text-red-500 dark:hover:text-red-400">
                        Quitar
                      </button>
                    </div>
                    {splitMode === "ITEMIZED" && (
                      <ReceiptAiButton
                        receiptUrl={receiptUrl}
                        participants={participants}
                        onApply={applyAiItems}
                      />
                    )}
                  </div>
                ) : (
                  <UploadPhoto onUpload={setReceiptUrl} label="+ Subir boleta" disabled={loading} subfolder="receipts" />
                )}
              </div>

              {/* Amount + Currency */}
              <div className="grid grid-cols-2 gap-3">
                {splitMode === "EQUAL" && (
                  <div className="flex flex-col gap-1">
                    <label htmlFor="edit-expense-amount" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Monto <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="edit-expense-amount"
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={fmtInput(amountValue, currency)}
                      onChange={(e) => setAmountValue(parseInputVal(e.target.value, currency))}
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                    />
                  </div>
                )}
                <div className={`flex flex-col gap-1 ${splitMode === "ITEMIZED" ? "col-span-2" : ""}`}>
                  <label htmlFor="edit-expense-currency" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Moneda</label>
                  <select
                    id="edit-expense-currency"
                    name="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:ring-zinc-500"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Paid by + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-paidBy" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Pagado por</label>
                  <select
                    id="edit-paidBy"
                    name="paidBy"
                    defaultValue={expense.paidByParticipantId ?? ""}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:ring-zinc-500"
                  >
                    <option value="">-- Seleccionar --</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-expense-date" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Fecha</label>
                  <DatePicker
                    id="edit-expense-date"
                    name="expenseDate"
                    defaultValue={defaultDateStr}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              {/* EQUAL: participant picker */}
              {splitMode === "EQUAL" && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Dividir entre <span className="text-zinc-400 dark:text-zinc-500">(equitativo)</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {participants.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleParticipant(p.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${selectedParticipants.includes(p.id) ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400"}`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ITEMIZED: items list */}
              {splitMode === "ITEMIZED" && (
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Ítems</span>
                  {items.map((item, idx) => (
                    <div key={item.id} className="rounded-xl border border-zinc-200 p-3 flex flex-col gap-2 dark:border-zinc-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Ítem {idx + 1}</span>
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(item.id)} className="text-xs text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors" aria-label="Eliminar ítem">✕</button>
                        )}
                      </div>
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <input type="text" placeholder="Descripción del ítem" maxLength={50} value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500" />
                        <input type="text" inputMode="numeric" placeholder="0" value={fmtInput(item.amount, currency)} onChange={(e) => updateItem(item.id, { amount: parseInputVal(e.target.value, currency) })}
                          className="w-28 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500" />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {participants.map((p) => (
                          <button key={p.id} type="button" onClick={() => toggleItemParticipant(item.id, p.id)}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${item.participantIds.includes(p.id) ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400"}`}>
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addItem} className="rounded-lg border border-dashed border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-300">
                    + Agregar ítem
                  </button>
                  {itemizedTotal > 0 && (
                    <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 dark:bg-zinc-700/50 dark:border-zinc-700">
                      <p className="text-xs font-semibold text-zinc-500 mb-2 dark:text-zinc-400">Resumen · Total {fmtAmount(itemizedTotal, currency)}</p>
                      <div className="flex flex-col gap-1">
                        {perParticipantTotals.filter((p) => p.total > 0).map((p) => (
                          <div key={p.id} className="flex items-center justify-between">
                            <span className="text-xs text-zinc-600 dark:text-zinc-400">{p.name}</span>
                            <span className="text-xs font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">{fmtAmount(p.total, currency)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={closeModal} disabled={loading} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700">Cancelar</button>
                <button type="submit" disabled={loading} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
