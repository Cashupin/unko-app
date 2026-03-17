"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CURRENCY_OPTIONS, CURRENCY_DECIMALS, fmtAmount } from "@/lib/constants";
import type { Currency } from "@/lib/constants";
import { DatePicker } from "@/components/date-picker";
import { UploadPhoto } from "@/components/upload-photo";
import { ReceiptButton } from "@/components/receipt-button";
import { ReceiptAiButton, type ParsedReceiptItem } from "@/components/receipt-ai-button";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemDraft = {
  id: string;
  description: string;
  amount: string;
  participantNames: string[];
  groupKey?: string;
  groupQty?: number;
  itemQty?: number;
};

export type StandaloneInitialValues = {
  expenseId: string;
  description: string;
  currency: string;
  expenseDate: string; // ISO or ""
  splitType: "EQUAL" | "ITEMIZED";
  amount: string;      // for EQUAL
  receiptUrl: string | null;
  participants: string[];
  paidByName: string;
  splitParticipantNames: string[];
  items: ItemDraft[];
};

// ─── Format helpers ────────────────────────────────────────────────────────────

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

// ─── Helper ───────────────────────────────────────────────────────────────────

function newItem(): ItemDraft {
  return {
    id: crypto.randomUUID(),
    description: "",
    amount: "",
    participantNames: [],
  };
}

function blankState(defaultCurrency = "CLP") {
  return {
    participants: [] as string[],
    paidByName: "",
    splitNames: [] as string[],
    currency: defaultCurrency,
    splitMode: "ITEMIZED" as "EQUAL" | "ITEMIZED",
    items: [] as ItemDraft[],
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props =
  | { mode?: "create" }
  | { mode: "edit"; initialValues: StandaloneInitialValues; onClose: () => void };

export function StandaloneExpenseForm(props: Props) {
  const isEdit = props.mode === "edit";
  const initialValues = isEdit ? props.initialValues : undefined;
  const onClose = isEdit ? props.onClose : undefined;

  const router = useRouter();
  const [open, setOpen] = useState(isEdit); // edit opens immediately
  const [loading, setLoading] = useState(false);
  const [splitMode, setSplitMode] = useState<"EQUAL" | "ITEMIZED">(
    initialValues?.splitType ?? "ITEMIZED",
  );
  const [currency, setCurrency] = useState(initialValues?.currency ?? "CLP");

  // Participants
  const [participants, setParticipants] = useState<string[]>(
    initialValues?.participants ?? [],
  );
  const [newName, setNewName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // EQUAL split names
  const [splitNames, setSplitNames] = useState<string[]>(
    initialValues?.splitParticipantNames ?? [],
  );

  // Paid by
  const [paidByName, setPaidByName] = useState(initialValues?.paidByName ?? "");

  // ITEMIZED items
  const [items, setItems] = useState<ItemDraft[]>(initialValues?.items ?? []);

  // EQUAL amount (formatted input)
  const [amountValue, setAmountValue] = useState(initialValues?.amount ?? "");

  // Receipt photo
  const [receiptUrl, setReceiptUrl] = useState<string | null>(initialValues?.receiptUrl ?? null);

  function resetState() {
    const s = blankState();
    setParticipants(s.participants);
    setPaidByName(s.paidByName);
    setSplitNames(s.splitNames);
    setCurrency(s.currency);
    setSplitMode(s.splitMode);
    setItems(s.items);
    setNewName("");
    setAmountValue("");
    setReceiptUrl(null);
  }

  function openModal() {
    resetState();
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    onClose?.();
  }

  function addParticipant() {
    const name = newName.trim();
    if (!name) return;
    if (name.length > 100) {
      toast.error("El nombre no puede superar 100 caracteres");
      return;
    }
    if (participants.length >= 20) {
      toast.error("Máximo 20 participantes");
      return;
    }
    if (participants.includes(name)) {
      toast.error(`"${name}" ya está en la lista`);
      return;
    }
    const updated = [...participants, name];
    setParticipants(updated);
    setSplitNames(updated);
    setNewName("");
    nameInputRef.current?.focus();
  }

  function removeParticipant(name: string) {
    const updated = participants.filter((p) => p !== name);
    setParticipants(updated);
    setSplitNames((prev) => prev.filter((p) => p !== name));
    if (paidByName === name) setPaidByName("");
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        participantNames: item.participantNames.filter((p) => p !== name),
      })),
    );
  }

  function toggleSplitName(name: string) {
    setSplitNames((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name],
    );
  }

  function toggleItemParticipant(itemId: string, name: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const names = item.participantNames.includes(name)
          ? item.participantNames.filter((p) => p !== name)
          : [...item.participantNames, name];
        return { ...item, participantNames: names };
      }),
    );
  }

  function updateItem(id: string, patch: Partial<Omit<ItemDraft, "id">>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function applyAiItems(parsed: ParsedReceiptItem[]) {
    setSplitMode("ITEMIZED");
    setItems(
      parsed.map((p) => ({
        id: crypto.randomUUID(),
        description: p.description,
        amount: String(p.amount),
        participantNames: p.assignees.length > 0 ? p.assignees : [...participants],
        groupKey: p.groupKey,
        groupQty: p.groupQty,
        itemQty: p.itemQty,
      })),
    );
  }

  // Real-time preview (ITEMIZED)
  const perPersonTotals = participants.map((name) => {
    const total = items.reduce((sum, item) => {
      if (!item.participantNames.includes(name)) return sum;
      const n = item.participantNames.length;
      return sum + (parseFloat(item.amount) || 0) / n;
    }, 0);
    return { name, total };
  });
  const itemizedTotal = perPersonTotals.reduce((s, p) => s + p.total, 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (participants.length === 0) {
      toast.error("Agrega al menos un participante");
      return;
    }
    if (!paidByName) {
      toast.error("Selecciona quién pagó");
      return;
    }

    const fd = new FormData(e.currentTarget);
    const description = (fd.get("description") as string).trim();
    const expenseDate = (fd.get("expenseDate") as string) || undefined;

    const url = isEdit
      ? `/api/standalone-expenses/${initialValues!.expenseId}`
      : "/api/standalone-expenses";
    const method = isEdit ? "PATCH" : "POST";

    if (splitMode === "EQUAL") {
      const amount = parseFloat(amountValue);
      if (!amountValue || isNaN(amount) || amount <= 0) { toast.error("Ingresa un monto válido"); return; }
      if (splitNames.length === 0) { toast.error("Selecciona al menos un participante para dividir"); return; }

      setLoading(true);
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            splitType: "EQUAL",
            description,
            amount,
            currency,
            receiptUrl: receiptUrl ?? null,
            expenseDate,
            participants,
            paidByName,
            splitParticipantNames: splitNames,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) { toast.error(data.error ?? "Error al guardar"); return; }
        closeModal();
        router.refresh();
        toast.success(isEdit ? "Gasto actualizado" : "Gasto registrado");
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
      if (!item.description.trim()) { toast.error("Cada ítem debe tener descripción"); return; }
      if (!(parseFloat(item.amount) > 0)) { toast.error("Cada ítem debe tener monto mayor a 0"); return; }
      if (item.participantNames.length === 0) { toast.error("Cada ítem debe tener al menos un participante"); return; }
    }

    setLoading(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          splitType: "ITEMIZED",
          description,
          currency,
          receiptUrl: receiptUrl ?? null,
          expenseDate,
          participants,
          paidByName,
          items: items.map((item) => ({
            description: item.description.trim(),
            amount: parseFloat(item.amount),
            participantNames: item.participantNames,
            groupKey: item.groupKey,
            groupQty: item.groupQty,
            itemQty: item.itemQty,
          })),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Error al guardar"); return; }
      closeModal();
      router.refresh();
      toast.success(isEdit ? "Gasto actualizado" : "Gasto registrado");
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500";

  return (
    <>
      {/* Trigger button — only shown in create mode */}
      {!isEdit && (
        <button
          onClick={openModal}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + Nuevo gasto
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 sm:p-6 shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto dark:bg-zinc-800">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {isEdit ? "Editar gasto" : "Nuevo gasto independiente"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 -mr-2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Descripción <span className="text-red-500">*</span>
                </label>
                <input
                  name="description"
                  type="text"
                  required
                  minLength={1}
                  maxLength={500}
                  defaultValue={initialValues?.description}
                  placeholder="Ej: Cena con amigos"
                  className={inputCls}
                />
              </div>

              {/* Split mode toggle */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Modo de división
                </span>
                <div className="flex rounded-lg border border-zinc-200 overflow-hidden dark:border-zinc-700">
                  {(["ITEMIZED", "EQUAL"] as const).map((mode, idx) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setSplitMode(mode);
                        if (mode === "ITEMIZED" && items.length === 0)
                          setItems([newItem()]);
                      }}
                      className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                        idx > 0 ? "border-l border-zinc-200 dark:border-zinc-700" : ""
                      } ${
                        splitMode === mode
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "bg-white text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {mode === "ITEMIZED" ? "Por ítems" : "División equitativa"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount + Currency */}
              <div className="grid grid-cols-2 gap-3">
                {splitMode === "EQUAL" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Monto <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={fmtInput(amountValue, currency)}
                      onChange={(e) => setAmountValue(parseInputVal(e.target.value, currency))}
                      className={inputCls}
                    />
                  </div>
                )}
                <div className={`flex flex-col gap-1 ${splitMode === "ITEMIZED" ? "col-span-2" : ""}`}>
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Moneda
                  </label>
                  <select
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

              {/* Date */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Fecha
                </label>
                <DatePicker
                  name="expenseDate"
                  placeholder="Opcional"
                  defaultValue={initialValues?.expenseDate}
                />
              </div>

              {/* Participants input */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Participantes <span className="text-red-500">*</span>
                </span>
                <div className="flex gap-2">
                  <input
                    ref={nameInputRef}
                    type="text"
                    placeholder="Nombre"
                    maxLength={100}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addParticipant(); }
                    }}
                    className={`flex-1 ${inputCls}`}
                  />
                  <button
                    type="button"
                    onClick={addParticipant}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  >
                    + Agregar
                  </button>
                </div>
                {participants.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {participants.map((name) => (
                      <span
                        key={name}
                        className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => removeParticipant(name)}
                          className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 ml-0.5"
                          aria-label={`Eliminar ${name}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Paid by */}
              {participants.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Pagado por <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paidByName}
                    onChange={(e) => setPaidByName(e.target.value)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:ring-zinc-500"
                  >
                    <option value="">-- Seleccionar --</option>
                    {participants.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              )}

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

              {/* EQUAL: split picker */}
              {splitMode === "EQUAL" && participants.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Dividir entre{" "}
                    <span className="text-zinc-400 dark:text-zinc-500">(equitativo)</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {participants.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleSplitName(name)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          splitNames.includes(name)
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ITEMIZED: items list */}
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
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Ítem {idx + 1}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-xs text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_auto]">
                        <input
                          type="text"
                          placeholder="Descripción"
                          maxLength={50}
                          value={item.description}
                          onChange={(e) =>
                            updateItem(item.id, { description: e.target.value })
                          }
                          className={inputCls}
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={fmtInput(item.amount, currency)}
                          onChange={(e) =>
                            updateItem(item.id, { amount: parseInputVal(e.target.value, currency) })
                          }
                          className={`sm:w-28 ${inputCls}`}
                        />
                      </div>
                      {participants.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {participants.map((name) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => toggleItemParticipant(item.id, name)}
                              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                item.participantNames.includes(name)
                                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400"
                              }`}
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addItem}
                    className="rounded-lg border border-dashed border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
                  >
                    + Agregar ítem
                  </button>

                  {itemizedTotal > 0 && (
                    <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 dark:bg-zinc-700/50 dark:border-zinc-700">
                      <p className="text-xs font-semibold text-zinc-500 mb-2 dark:text-zinc-400">
                        Resumen · Total {fmtAmount(itemizedTotal, currency)}
                      </p>
                      <div className="flex flex-col gap-1">
                        {perPersonTotals
                          .filter((p) => p.total > 0)
                          .map((p) => (
                            <div key={p.name} className="flex items-center justify-between">
                              <span className="text-xs text-zinc-600 dark:text-zinc-400">{p.name}</span>
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

              <div className="flex justify-end gap-2 pt-1">
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
                  {loading ? "Guardando..." : isEdit ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
