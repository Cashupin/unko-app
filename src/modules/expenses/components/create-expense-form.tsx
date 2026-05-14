"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCY_OPTIONS, CURRENCY_DECIMALS, fmtAmount } from "@/lib/constants";
import type { Currency } from "@/lib/constants";
import { DatePicker } from "@/components/ui/date-picker";
import { UploadPhoto } from "@/components/ui/upload-photo";
import { ReceiptButton } from "@/modules/expenses/components/receipt-button";
import { ReceiptAiButton, type ParsedReceiptItem } from "@/modules/expenses/components/receipt-ai-button";
import { toast } from "sonner";
import { useCurrency } from "@/providers/currency-provider";
import { CATEGORY_CONFIG, detectCategory, type ExpenseCategory } from "@/modules/expenses/lib/expense-categories";

// Format raw numeric string for display inside the input (es-CL thousands separator)
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

// Strip formatting from typed input, returning raw value for state (period as decimal sep)
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

export function CreateExpenseForm({
  tripId,
  participants,
  defaultCurrency,
}: {
  tripId: string;
  participants: Participant[];
  defaultCurrency: string;
}) {
  const router = useRouter();
  const { convert, exchangeRates } = useCurrency();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [splitMode, setSplitMode] = useState<"EQUAL" | "ITEMIZED">("ITEMIZED");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [amountValue, setAmountValue] = useState("");

  // EQUAL mode state
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    participants.map((p) => p.id),
  );

  // ITEMIZED mode state
  const [items, setItems] = useState<ExpenseItemDraft[]>([]);

  const [category, setCategory] = useState<ExpenseCategory>("OTHER");

  function openModal() {
    setSelectedParticipants(participants.map((p) => p.id));
    setSplitMode("EQUAL");
    setCurrency(defaultCurrency);
    setPaymentMethod("CASH");
    setReceiptUrl(null);
    setAmountValue("");
    setItems([newItem(participants)]);
    setCategory("OTHER");
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

  // Real-time per-participant totals for ITEMIZED mode
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
        receiptUrl: receiptUrl ?? undefined,
        paidByParticipantId: (fd.get("paidBy") as string) || undefined,
        expenseDate: (fd.get("expenseDate") as string) || undefined,
        participantIds: selectedParticipants,
        category,
      };

      try {
        const res = await fetch(`/api/trips/${tripId}/expenses`, {
          method: "POST",
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
        toast.success("Gasto registrado");
      } catch {
        toast.error("Error de red. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── ITEMIZED ─────────────────────────────────────────────────────────────

    if (items.length === 0) {
      toast.error("Agrega al menos un ítem");
      return;
    }

    for (const item of items) {
      if (!item.description.trim()) {
        toast.error("Cada ítem debe tener una descripción");
        return;
      }
      const amt = parseFloat(item.amount);
      if (!amt || amt <= 0) {
        toast.error("Cada ítem debe tener un monto mayor a 0");
        return;
      }
      if (item.participantIds.length === 0) {
        toast.error("Cada ítem debe tener al menos un participante");
        return;
      }
    }

    setLoading(true);
    const body = {
      splitType: "ITEMIZED",
      description: (fd.get("description") as string).trim(),
      currency: fd.get("currency") as string,
      paymentMethod,
      receiptUrl: receiptUrl ?? undefined,
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
      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
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
      toast.success("Gasto registrado");
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
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        + Nuevo gasto
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="flex h-full w-full max-w-110 flex-col bg-white dark:bg-[#18191c] border-l border-zinc-200 dark:border-[#3f3f46] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#2d2d31] px-5 py-4 shrink-0">
              <h2 className="text-base font-semibold dark:text-zinc-100">Nuevo gasto</h2>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-[#27272a] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-[#3f3f46]"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              {/* Description */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="expense-desc"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Descripción <span className="text-red-500">*</span>
                </label>
                <input
                  id="expense-desc"
                  name="description"
                  type="text"
                  required
                  minLength={1}
                  maxLength={500}
                  placeholder="Ej: Cena en Shibuya"
                  onChange={(e) => {
                    const detected = detectCategory(e.target.value);
                    setCategory(detected);
                  }}
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
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Modo de división
                </span>
                <div className="flex rounded-lg border border-zinc-200 overflow-hidden dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setSplitMode("EQUAL")}
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                      splitMode === "EQUAL"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-white text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    }`}
                  >
                    División equitativa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSplitMode("ITEMIZED");
                      if (items.length === 0) setItems([newItem(participants)]);
                    }}
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors border-l border-zinc-200 dark:border-zinc-700 ${
                      splitMode === "ITEMIZED"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-white text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    }`}
                  >
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
                    {/* Card preview */}
                    <div className="flex items-center gap-3 rounded-xl border border-zinc-100 dark:border-[#3f3f46] bg-zinc-50 dark:bg-[#27272a] px-3 py-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/60 text-lg">
                        🧾
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 truncate">Boleta subida</p>
                        <ReceiptButton url={receiptUrl} label="Ver foto →" className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setReceiptUrl(null)}
                        className="text-xs text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 shrink-0"
                      >
                        Quitar
                      </button>
                    </div>
                    {/* AI button — always visible when receipt is uploaded */}
                    <ReceiptAiButton
                      receiptUrl={receiptUrl}
                      participants={participants}
                      onApply={applyAiItems}
                    />
                  </div>
                ) : (
                  <UploadPhoto onUpload={setReceiptUrl} label="+ Subir boleta" disabled={loading} subfolder={`${tripId}/receipts`} />
                )}
              </div>

              {/* Currency */}
              <div className="grid grid-cols-2 gap-3">
                {splitMode === "EQUAL" && (
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="expense-amount"
                      className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Monto <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="expense-amount"
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
                  <label
                    htmlFor="expense-currency"
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Moneda
                  </label>
                  <select
                    id="expense-currency"
                    name="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:ring-zinc-500"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conversion preview */}
              {currency !== defaultCurrency && exchangeRates.status === "ready" && (() => {
                const previewAmount = splitMode === "EQUAL"
                  ? parseFloat(amountValue) || 0
                  : items.reduce((s, item) => s + (parseFloat(item.amount) || 0), 0);
                if (previewAmount <= 0) return null;
                const converted = convert(previewAmount, currency);
                return (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 dark:bg-amber-900/20 dark:border-amber-800/50">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Se guardará como <span className="font-semibold">≈ {fmtAmount(converted, defaultCurrency)} {defaultCurrency}</span> (moneda del viaje)
                    </p>
                  </div>
                );
              })()}

              {/* Paid by + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="paidBy"
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Pagado por
                  </label>
                  <select
                    id="paidBy"
                    name="paidBy"
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:ring-zinc-500"
                  >
                    <option value="">-- Seleccionar --</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="expense-date"
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Fecha
                  </label>
                  <DatePicker
                    id="expense-date"
                    name="expenseDate"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              {/* ── EQUAL: participant picker ──────────────────────────────── */}
              {splitMode === "EQUAL" && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Dividir entre{" "}
                    <span className="text-zinc-400 dark:text-zinc-500">
                      (equitativo)
                    </span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {participants.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleParticipant(p.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          selectedParticipants.includes(p.id)
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── ITEMIZED: items list ───────────────────────────────────── */}
              {splitMode === "ITEMIZED" && (
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Ítems
                  </span>

                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-zinc-200 p-3 flex flex-col gap-2 dark:border-zinc-700"
                    >
                      {/* Item header */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Ítem {idx + 1}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-xs text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors"
                            aria-label="Eliminar ítem"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Description + amount */}
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <input
                          type="text"
                          placeholder="Descripción del ítem"
                          maxLength={50}
                          value={item.description}
                          onChange={(e) =>
                            updateItem(item.id, { description: e.target.value })
                          }
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={fmtInput(item.amount, currency)}
                          onChange={(e) =>
                            updateItem(item.id, { amount: parseInputVal(e.target.value, currency) })
                          }
                          className="w-28 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                        />
                      </div>

                      {/* Participant toggles */}
                      <div className="flex flex-wrap gap-1.5">
                        {participants.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleItemParticipant(item.id, p.id)}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                              item.participantIds.includes(p.id)
                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400"
                            }`}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addItem}
                    className="rounded-lg border border-dashed border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
                  >
                    + Agregar ítem
                  </button>

                  {/* Per-participant preview */}
                  {itemizedTotal > 0 && (
                    <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 dark:bg-zinc-700/50 dark:border-zinc-700">
                      <p className="text-xs font-semibold text-zinc-500 mb-2 dark:text-zinc-400">
                        Resumen · Total {fmtAmount(itemizedTotal, currency)}
                      </p>
                      <div className="flex flex-col gap-1">
                        {perParticipantTotals
                          .filter((p) => p.total > 0)
                          .map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between"
                            >
                              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                {p.name}
                              </span>
                              <span className="text-xs font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                                {fmtAmount(p.total, currency)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
              <div className="flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-[#2d2d31] px-5 py-4 shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
