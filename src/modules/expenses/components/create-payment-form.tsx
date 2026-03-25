"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCY_OPTIONS } from "@/lib/constants";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";

type Participant = { id: string; name: string };

export function CreatePaymentForm({
  tripId,
  participants,
  defaultCurrency,
  fromId,
  toId,
  suggestedAmount,
  suggestedCurrency,
}: {
  tripId: string;
  participants: Participant[];
  defaultCurrency: string;
  fromId?: string;
  toId?: string;
  suggestedAmount?: number;
  suggestedCurrency?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  function openModal() {
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);

    const body = {
      fromParticipantId: fd.get("fromParticipantId") as string,
      toParticipantId: fd.get("toParticipantId") as string,
      amount: parseFloat(fd.get("amount") as string),
      currency: fd.get("currency") as string,
      paidAt: (fd.get("paidAt") as string) || undefined,
    };

    try {
      const res = await fetch(`/api/trips/${tripId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Error al registrar el pago");
        return;
      }

      closeModal();
      router.refresh();
      toast.success("Pago registrado");
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
        className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
      >
        Registrar pago
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-800">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Registrar pago</h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300" aria-label="Cerrar">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="fromParticipantId" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    De <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="fromParticipantId" name="fromParticipantId" required
                    defaultValue={fromId ?? ""}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:ring-zinc-500"
                  >
                    <option value="" disabled>-- Quién paga --</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="toParticipantId" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    A <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="toParticipantId" name="toParticipantId" required
                    defaultValue={toId ?? ""}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:ring-zinc-500"
                  >
                    <option value="" disabled>-- Quién recibe --</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="payment-amount" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Monto <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="payment-amount" name="amount" type="number" min="0.01" step="0.01" required
                    defaultValue={suggestedAmount}
                    placeholder="0.00"
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="payment-currency" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Moneda</label>
                  <select
                    id="payment-currency" name="currency"
                    defaultValue={suggestedCurrency ?? defaultCurrency}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:ring-zinc-500"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="paidAt" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Fecha del pago</label>
                <DatePicker
                  id="paidAt"
                  name="paidAt"
                  placeholder="Seleccionar fecha (opcional)"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button" onClick={closeModal} disabled={loading}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={loading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {loading ? "Guardando..." : "Confirmar pago"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
