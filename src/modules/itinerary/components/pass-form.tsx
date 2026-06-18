"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CURRENCIES, CURRENCY_SYMBOLS } from "@/lib/constants";
import { DatePicker } from "@/components/ui/date-picker";

type PassInitial = {
  id: string;
  name: string;
  validFrom: string | null;
  validTo: string | null;
  cost: number | null;
  currency: string;
  isPaid: boolean;
  notes: string | null;
};

export function PassForm({
  tripId,
  defaultCurrency,
  tripStartDate,
  tripEndDate,
  initial,
  onClose,
}: {
  tripId: string;
  defaultCurrency: string;
  tripStartDate?: string;
  tripEndDate?: string;
  initial?: PassInitial;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [validFrom, setValidFrom] = useState(initial?.validFrom?.slice(0, 10) ?? "");
  const [validTo, setValidTo] = useState(initial?.validTo?.slice(0, 10) ?? "");
  const [cost, setCost] = useState(initial?.cost?.toString() ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency);
  const [isPaid, setIsPaid] = useState(initial?.isPaid ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const body = {
        name: name.trim(),
        validFrom: validFrom || undefined,
        validTo: validTo || undefined,
        cost: cost ? parseFloat(cost) : undefined,
        currency,
        isPaid,
        notes: notes.trim() || undefined,
      };
      const url = isEdit
        ? `/api/passes/${initial.id}`
        : `/api/trips/${tripId}/passes`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al guardar pase");
      }
      toast.success(isEdit ? "Pase actualizado" : "Pase creado");
      router.refresh();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar pase");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
          Nombre del pase *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ej. JR Kyushu Pass 3 días"
          required
          className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
            Válido desde
          </label>
          <DatePicker
            value={validFrom}
            onChange={setValidFrom}
            min={tripStartDate}
            max={tripEndDate}
            initialMonth={tripStartDate}
            placeholder="Fecha inicio"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
            Válido hasta
          </label>
          <DatePicker
            value={validTo}
            onChange={setValidTo}
            min={tripStartDate}
            max={tripEndDate}
            initialMonth={tripStartDate}
            placeholder="Fecha fin"
          />
        </div>
      </div>

      {/* Cost + currency */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
            Costo
          </label>
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            min="0"
            step="any"
            placeholder="0"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
            Moneda
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_SYMBOLS[c]} {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* isPaid toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setIsPaid((v) => !v)}
          className={`relative h-5 w-9 rounded-full transition-colors ${isPaid ? "bg-emerald-500" : "bg-zinc-700"}`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isPaid ? "translate-x-4" : "translate-x-0.5"}`}
          />
        </div>
        <span className="text-sm text-zinc-300">Ya pagado</span>
      </label>

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
          Notas
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ej. Comprado en JR Hakata Station"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="flex-1 rounded-xl bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-white transition-colors disabled:opacity-50"
        >
          {loading ? "Guardando..." : isEdit ? "Guardar" : "Crear pase"}
        </button>
      </div>
    </form>
  );
}
