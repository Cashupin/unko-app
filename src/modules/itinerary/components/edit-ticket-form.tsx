"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CURRENCY_OPTIONS } from "@/lib/constants";
import { DatePicker } from "@/components/ui/date-picker";

type Activity = { id: string; title: string; activityDate: string | null };

type TicketData = {
  id: string;
  title: string;
  description: string | null;
  scope: "GROUP" | "INDIVIDUAL";
  visitDate: string | null;
  buyFrom: string | null;
  buyTime: string | null;
  buyDeadline: string | null;
  price: number | null;
  currency: string;
  link: string | null;
  notes: string | null;
  activity: { id: string; title: string; activityDate: string | null } | null;
};

export function EditTicketForm({
  tripId,
  ticket,
  activities,
  open,
  onClose,
}: {
  tripId: string;
  ticket: TicketData;
  activities: Activity[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activitySearch, setActivitySearch] = useState("");

  const [form, setForm] = useState({
    title: ticket.title,
    description: ticket.description ?? "",
    scope: ticket.scope,
    visitDate: ticket.visitDate ?? "",
    buyFrom: ticket.buyFrom ?? "",
    buyTime: ticket.buyTime ?? "",
    buyDeadline: ticket.buyDeadline ?? "",
    price: ticket.price != null ? String(ticket.price) : "",
    currency: ticket.currency,
    link: ticket.link ?? "",
    notes: ticket.notes ?? "",
    activityId: ticket.activity?.id ?? "",
  });

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const filteredActivities = activities.filter((a) =>
    a.title.toLowerCase().includes(activitySearch.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          scope: form.scope,
          visitDate: form.visitDate || null,
          buyFrom: form.buyFrom || null,
          buyTime: form.buyTime || null,
          buyDeadline: form.buyDeadline || null,
          price: form.price ? parseFloat(form.price) : null,
          currency: form.currency,
          link: form.link.trim() || null,
          notes: form.notes.trim() || null,
          activityId: form.activityId || null,
        }),
      });

      if (!res.ok) {
        toast.error("Error al guardar");
        return;
      }

      toast.success("Entrada actualizada");
      onClose();
      router.refresh();
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const inputCls = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-[#3f3f46] dark:bg-[#27272a] dark:text-zinc-100 dark:placeholder-zinc-600 dark:focus:ring-zinc-600";
  const labelCls = "text-xs font-medium text-zinc-600 dark:text-zinc-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 dark:border dark:border-[#27272a] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-[#27272a]">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Editar entrada</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Nombre <span className="text-red-500">*</span></label>
            <input
              autoFocus
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
              className={inputCls}
            />
          </div>

          {/* Scope */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Tipo</label>
            <div className="flex gap-2">
              {(["GROUP", "INDIVIDUAL"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("scope", s)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    form.scope === s
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:border-[#3f3f46] dark:text-zinc-400 dark:hover:border-zinc-500"
                  }`}
                >
                  {s === "GROUP" ? "🎟️ Grupal" : "👤 Individual"}
                </button>
              ))}
            </div>
          </div>

          {/* Activity link */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Actividad relacionada (opcional)</label>
            {form.activityId ? (
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-[#3f3f46]">
                <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-100">
                  {activities.find((a) => a.id === form.activityId)?.title}
                </span>
                <button type="button" onClick={() => { set("activityId", ""); setActivitySearch(""); }} className="text-xs text-zinc-400 hover:text-red-500 transition-colors">✕</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar actividad…"
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className={inputCls}
                />
                {activitySearch && filteredActivities.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-[#3f3f46] dark:bg-zinc-800 max-h-40 overflow-y-auto">
                    {filteredActivities.slice(0, 8).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => { set("activityId", a.id); setActivitySearch(""); }}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-700"
                      >
                        <span className="font-medium">{a.title}</span>
                        {a.activityDate && <span className="ml-2 text-xs text-zinc-400">{a.activityDate}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {activitySearch && filteredActivities.length === 0 && (
                  <p className="mt-1 text-xs text-zinc-400">Sin coincidencias</p>
                )}
              </div>
            )}
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Día de visita</label>
              <DatePicker value={form.visitDate} onChange={(v) => set("visitDate", v)} placeholder="Sin fecha" />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Comprar desde</label>
              <DatePicker value={form.buyFrom} onChange={(v) => set("buyFrom", v)} placeholder="Sin fecha" />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Límite de compra</label>
              <DatePicker value={form.buyDeadline} onChange={(v) => set("buyDeadline", v)} placeholder="Sin fecha" />
            </div>
          </div>

          {/* Buy time */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Hora de apertura de venta <span className="text-zinc-500">(hora local Japón)</span></label>
            <input
              type="time"
              value={form.buyTime}
              onChange={(e) => set("buyTime", e.target.value)}
              className={`${inputCls} w-36`}
            />
          </div>

          {/* Price + currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Precio por persona</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Moneda</label>
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={inputCls}>
                {CURRENCY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Link */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Link de reserva</label>
            <input type="url" placeholder="https://…" value={form.link} onChange={(e) => set("link", e.target.value)} className={inputCls} />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Notas</label>
            <textarea
              rows={2}
              placeholder="Info extra…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={loading}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-[#3f3f46] dark:text-zinc-400 dark:hover:bg-white/5">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !form.title.trim()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
              {loading ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
