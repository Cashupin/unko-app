"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CURRENCY_DECIMALS, CURRENCY_OPTIONS, fmtAmount } from "@/lib/constants";
import type { Currency } from "@/lib/constants";

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

export function HotelExpenseButton({
  tripId,
  hotel,
  participants,
  hasExpense,
}: {
  tripId: string;
  hotel: {
    name: string;
    totalPrice: number | null;
    currency: string;
    checkInDate: Date;
  };
  participants: Participant[];
  hasExpense?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [amountValue, setAmountValue] = useState("");
  const [currency, setCurrency] = useState(hotel.currency);
  const [paidBy, setPaidBy] = useState("");

  function openModal() {
    setDescription(`Alojamiento · ${hotel.name}`);
    setAmountValue(hotel.totalPrice != null ? String(hotel.totalPrice) : "");
    setCurrency(hotel.currency);
    setPaidBy("");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!paidBy) {
      toast.error("Debes indicar quién pagó el alojamiento");
      return;
    }

    const amount = parseFloat(amountValue);
    if (!amountValue || isNaN(amount) || amount <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    if (participants.length === 0) {
      toast.error("No hay participantes en el viaje");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          splitType: "EQUAL",
          description: description.trim(),
          amount,
          currency,
          paymentMethod: "DEBIT",
          paidByParticipantId: paidBy,
          expenseDate: new Date(hotel.checkInDate).toISOString().slice(0, 10),
          participantIds: participants.map((p) => p.id),
          category: "ACCOMMODATION",
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Error al crear el gasto");
        return;
      }

      setOpen(false);
      router.refresh();
      toast.success("Gasto de alojamiento registrado");
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const amount = parseFloat(amountValue) || 0;
  const perPerson = participants.length > 0 ? amount / participants.length : 0;

  if (hasExpense) {
    return (
      <span className="flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:border-emerald-900/50 dark:text-emerald-500">
        ✓ Gasto registrado
      </span>
    );
  }

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors dark:border-[#3f3f46] dark:text-zinc-400 dark:hover:bg-white/5"
      >
        💳 Crear gasto
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 dark:border dark:border-[#27272a]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-[#27272a]">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Gasto de alojamiento
                </h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  División equitativa entre {participants.length} participante{participants.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Descripción
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-[#3f3f46] dark:bg-[#27272a] dark:text-zinc-100 dark:focus:ring-zinc-600"
                />
              </div>

              {/* Amount + currency */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Monto total <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={fmtInput(amountValue, currency)}
                    onChange={(e) => setAmountValue(parseInputVal(e.target.value, currency))}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-[#3f3f46] dark:bg-[#27272a] dark:text-zinc-100 dark:placeholder-zinc-600 dark:focus:ring-zinc-600"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Moneda
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-[#3f3f46] dark:bg-[#27272a] dark:text-zinc-100 dark:focus:ring-zinc-600"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Per-person preview */}
              {amount > 0 && participants.length > 0 && (
                <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3 dark:bg-[#1f2023] dark:border-[#27272a]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Por persona ({participants.length})
                    </span>
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 tabular-nums">
                      {fmtAmount(perPerson, currency as Currency)}
                    </span>
                  </div>
                </div>
              )}

              {/* Who paid */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  ¿Quién pagó? <span className="text-red-500">*</span>
                </label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  required
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-[#3f3f46] dark:bg-[#27272a] dark:text-zinc-100 dark:focus:ring-zinc-600"
                >
                  <option value="">— Seleccionar —</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-[#3f3f46] dark:text-zinc-400 dark:hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {loading ? "Creando..." : "Crear gasto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
