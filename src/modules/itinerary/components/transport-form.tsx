"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CURRENCIES, CURRENCY_SYMBOLS } from "@/lib/constants";
import { DatePicker } from "@/components/ui/date-picker";

export const TRANSPORT_ICONS: Record<string, string> = {
  FLIGHT: "✈️",
  TRAIN: "🚅",
  BUS: "🚌",
  FERRY: "⛴️",
  CAR: "🚗",
};
export const TRANSPORT_LABELS: Record<string, string> = {
  FLIGHT: "Vuelo",
  TRAIN: "Tren",
  BUS: "Bus",
  FERRY: "Ferry",
  CAR: "Auto",
};

type PassOption = { id: string; name: string };

type TransportInitial = {
  id: string;
  origin: string;
  destination: string;
  type: string;
  departureDate: string | null;
  departureTime: string | null;
  arrivalDate: string | null;
  arrivalTime: string | null;
  cost: number | null;
  currency: string;
  isPaid: boolean;
  notes: string | null;
  coveredByPassId: string | null;
};

export function TransportForm({
  tripId,
  defaultCurrency,
  tripStartDate,
  tripEndDate,
  passes,
  initial,
  onClose,
}: {
  tripId: string;
  defaultCurrency: string;
  tripStartDate?: string;
  tripEndDate?: string;
  passes: PassOption[];
  initial?: TransportInitial;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!initial;

  const [origin, setOrigin] = useState(initial?.origin ?? "");
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [type, setType] = useState(initial?.type ?? "FLIGHT");
  const [departureDate, setDepartureDate] = useState(initial?.departureDate?.slice(0, 10) ?? "");
  const [departureTime, setDepartureTime] = useState(initial?.departureTime ?? "");
  const [arrivalDate, setArrivalDate] = useState(initial?.arrivalDate?.slice(0, 10) ?? "");
  const [arrivalTime, setArrivalTime] = useState(initial?.arrivalTime ?? "");
  const [cost, setCost] = useState(initial?.cost?.toString() ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency);
  const [isPaid, setIsPaid] = useState(initial?.isPaid ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [coveredByPassId, setCoveredByPassId] = useState(initial?.coveredByPassId ?? "");
  const [loading, setLoading] = useState(false);

  const isCoveredByPass = !!coveredByPassId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) return;
    setLoading(true);
    try {
      const body = {
        origin: origin.trim(),
        destination: destination.trim(),
        type,
        departureDate: departureDate || undefined,
        departureTime: departureTime || undefined,
        arrivalDate: arrivalDate || undefined,
        arrivalTime: arrivalTime || undefined,
        cost: !isCoveredByPass && cost ? parseFloat(cost) : undefined,
        currency: !isCoveredByPass ? currency : undefined,
        isPaid: isCoveredByPass ? true : isPaid,
        notes: notes.trim() || undefined,
        coveredByPassId: isEdit ? (coveredByPassId || null) : (coveredByPassId || undefined),
      };
      const url = isEdit
        ? `/api/transports/${initial.id}`
        : `/api/trips/${tripId}/transports`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al guardar transporte");
      }
      toast.success(isEdit ? "Transporte actualizado" : "Transporte creado");
      router.refresh();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar transporte");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Type selector */}
      <div>
        <label className="mb-2 block text-xs font-semibold text-zinc-400">Tipo</label>
        <div className="flex gap-2">
          {Object.entries(TRANSPORT_ICONS).map(([key, icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setType(key)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-semibold transition-colors ${
                type === key
                  ? "border-zinc-400 bg-zinc-700 text-zinc-100"
                  : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600"
              }`}
            >
              <span className="text-base">{icon}</span>
              <span>{TRANSPORT_LABELS[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Route */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Origen *</label>
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="ej. Narita"
            required
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Destino *</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="ej. Kumamoto"
            required
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Departure */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Fecha salida</label>
          <DatePicker
            value={departureDate}
            onChange={setDepartureDate}
            min={tripStartDate}
            max={tripEndDate}
            initialMonth={tripStartDate}
            placeholder="Fecha salida"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Hora salida</label>
          <input
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none scheme-dark"
          />
        </div>
      </div>

      {/* Arrival */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Fecha llegada</label>
          <DatePicker
            value={arrivalDate}
            onChange={setArrivalDate}
            min={tripStartDate}
            initialMonth={departureDate || tripStartDate}
            placeholder="Fecha llegada"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Hora llegada</label>
          <input
            type="time"
            value={arrivalTime}
            onChange={(e) => setArrivalTime(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none scheme-dark"
          />
        </div>
      </div>

      {/* Pass coverage */}
      {passes.length > 0 && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
            Cubierto por pase
          </label>
          <select
            value={coveredByPassId}
            onChange={(e) => setCoveredByPassId(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          >
            <option value="">— Sin pase (costo propio) —</option>
            {passes.map((p) => (
              <option key={p.id} value={p.id}>
                📦 {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Cost (hidden when covered by pass) */}
      {!isCoveredByPass && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Costo</label>
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
            <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Moneda</label>
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
      )}

      {/* isPaid (hidden when covered by pass) */}
      {!isCoveredByPass && (
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
      )}

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Notas</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ej. Reserva confirmada, asiento 12A"
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
          disabled={loading || !origin.trim() || !destination.trim()}
          className="flex-1 rounded-xl bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-white transition-colors disabled:opacity-50"
        >
          {loading ? "Guardando..." : isEdit ? "Guardar" : "Agregar tramo"}
        </button>
      </div>
    </form>
  );
}
