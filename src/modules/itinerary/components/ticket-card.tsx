"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { fmtAmount, CURRENCY_OPTIONS, CURRENCY_DECIMALS } from "@/lib/constants";
import type { Currency } from "@/lib/constants";
import { ConvertedAmount } from "@/components/ui/converted-amount";
import { EditTicketForm } from "@/modules/itinerary/components/edit-ticket-form";

type Participant = { id: string; name: string };

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
  isPurchased: boolean;
  purchasedBy: { id: string; name: string } | null;
  activity: { id: string; title: string; activityDate: string | null } | null;
};

function fmtDate(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function deadlineStatus(deadline: string | null): "urgent" | "soon" | "ok" | null {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl = new Date(deadline + "T00:00:00");
  const days = Math.round((dl.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "urgent";
  if (days <= 7) return "urgent";
  if (days <= 21) return "soon";
  return "ok";
}

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

type Activity = { id: string; title: string; activityDate: string | null };

export function TicketCard({
  ticket,
  tripId,
  participants,
  isAdmin,
  activities,
}: {
  ticket: TicketData;
  tripId: string;
  participants: Participant[];
  isAdmin: boolean;
  activities: Activity[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // ── Mark as purchased (no expense) ──────────────────────────────────────────
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchasedBy, setPurchasedBy] = useState("");

  // ── Create expense (independent) ────────────────────────────────────────────
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [paidBy, setPaidBy] = useState("");
  const [amountValue, setAmountValue] = useState(
    ticket.price != null
      ? String(ticket.price * (ticket.scope === "GROUP" ? participants.length : 1))
      : ""
  );
  const [currency, setCurrency] = useState(ticket.currency);

  const dl = deadlineStatus(ticket.buyDeadline);
  const isAvailable = !ticket.buyFrom || ticket.buyFrom <= new Date().toISOString().slice(0, 10);

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${ticket.title}"?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/trips/${tripId}/tickets/${ticket.id}`, { method: "DELETE" });
      router.refresh();
      toast.success("Entrada eliminada");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(false);
    }
  }

  async function handleMarkPurchased() {
    if (!purchasedBy) { toast.error("Indica quién compró la entrada"); return; }
    setPurchaseLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPurchased: true, purchasedById: purchasedBy }),
      });
      if (!res.ok) { toast.error("Error al actualizar"); return; }
      setPurchaseOpen(false);
      router.refresh();
      toast.success("Entrada marcada como comprada");
    } catch {
      toast.error("Error de red");
    } finally {
      setPurchaseLoading(false);
    }
  }

  async function handleUnmarkPurchased() {
    setPurchaseLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPurchased: false, purchasedById: null }),
      });
      if (!res.ok) { toast.error("Error al actualizar"); return; }
      router.refresh();
      toast.success("Entrada desmarcada");
    } catch {
      toast.error("Error de red");
    } finally {
      setPurchaseLoading(false);
    }
  }

  async function handleCreateExpense() {
    if (!paidBy) { toast.error("Indica quién pagó"); return; }
    const amount = parseFloat(amountValue);
    if (!amountValue || isNaN(amount) || amount <= 0) { toast.error("El monto debe ser mayor a 0"); return; }

    setExpenseLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          splitType: "EQUAL",
          description: `Entrada · ${ticket.title}`,
          amount,
          currency,
          paymentMethod: "DEBIT",
          paidByParticipantId: paidBy,
          participantIds: ticket.scope === "GROUP" ? participants.map((p) => p.id) : [paidBy],
          category: "OTHER",
        }),
      });
      if (!res.ok) { toast.error("Error al crear el gasto"); return; }
      setExpenseOpen(false);
      router.refresh();
      toast.success("Gasto registrado");
    } catch {
      toast.error("Error de red");
    } finally {
      setExpenseLoading(false);
    }
  }

  const expenseAmount = parseFloat(amountValue) || 0;
  const perPerson = participants.length > 0 && ticket.scope === "GROUP"
    ? expenseAmount / participants.length
    : expenseAmount;

  const inputCls = "rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-[#3f3f46] dark:bg-[#27272a] dark:text-zinc-100 dark:placeholder-zinc-600 dark:focus:ring-zinc-600";
  const selectCls = `${inputCls} bg-white dark:bg-[#27272a]`;
  const labelCls = "text-xs font-medium text-zinc-600 dark:text-zinc-400";

  return (
    <>
      <div className={`group rounded-2xl border p-4 transition-colors ${
        ticket.isPurchased
          ? "border-emerald-800/40 bg-emerald-950/20"
          : dl === "urgent"
          ? "border-red-800/50 bg-red-950/20"
          : dl === "soon"
          ? "border-amber-800/40 bg-amber-950/15"
          : "border-[#27272a] bg-[#18191c]"
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Title + badges */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-zinc-100">{ticket.title}</p>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                ticket.scope === "GROUP" ? "border-zinc-700 text-zinc-400" : "border-violet-700/50 text-violet-400"
              }`}>
                {ticket.scope === "GROUP" ? "Grupal" : "Individual"}
              </span>
              {ticket.isPurchased && (
                <span className="rounded-full border border-emerald-700/50 bg-emerald-900/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  ✓ Comprada{ticket.purchasedBy ? ` · ${ticket.purchasedBy.name}` : ""}
                </span>
              )}
            </div>

            {ticket.description && <p className="text-xs text-zinc-400 mb-2">{ticket.description}</p>}

            {ticket.activity && (
              <p className="mb-2 text-xs text-zinc-500">
                🗓️ {ticket.activity.title}
                {ticket.activity.activityDate && ` · ${fmtDate(ticket.activity.activityDate)}`}
              </p>
            )}

            {/* Dates + price */}
            <div className="flex flex-wrap gap-3 text-xs">
              {ticket.visitDate && (
                <span className="text-zinc-400">📅 Visita: <strong className="text-zinc-300">{fmtDate(ticket.visitDate)}</strong></span>
              )}
              {ticket.buyFrom && (
                <span className={isAvailable ? "text-emerald-400" : "text-amber-400"}>
                  {isAvailable ? "✓" : "⏳"} Disponible desde: <strong>{fmtDate(ticket.buyFrom)}</strong>
                  {ticket.buyTime && <span className="ml-1 opacity-80">a las {ticket.buyTime} JST</span>}
                </span>
              )}
              {ticket.buyDeadline && (
                <span className={dl === "urgent" ? "text-red-400 font-semibold" : dl === "soon" ? "text-amber-400 font-semibold" : "text-zinc-400"}>
                  {dl === "urgent" ? "⚠️" : dl === "soon" ? "⏰" : "📌"} Límite: <strong>{fmtDate(ticket.buyDeadline)}</strong>
                </span>
              )}
              {ticket.price != null && (
                <span className="text-zinc-400">
                  💴 <ConvertedAmount amount={ticket.price} currency={ticket.currency} className="text-zinc-400" />/persona
                </span>
              )}
            </div>

            {ticket.notes && <p className="mt-2 text-xs italic text-zinc-500">{ticket.notes}</p>}
          </div>

          {/* Actions column */}
          <div className="flex shrink-0 flex-col items-end gap-2">
            {ticket.link && (
              <a href={ticket.link} target="_blank" rel="noopener noreferrer"
                className="rounded-lg border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors">
                🔗 Reservar
              </a>
            )}
            {!ticket.isPurchased ? (
              <button type="button" onClick={() => setPurchaseOpen(true)}
                className="rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-900/40 transition-colors">
                ✓ Marcar comprada
              </button>
            ) : isAdmin ? (
              <button type="button" onClick={handleUnmarkPurchased} disabled={purchaseLoading}
                className="rounded-lg border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 disabled:opacity-40 transition-colors">
                {purchaseLoading ? "…" : "Desmarcar"}
              </button>
            ) : null}
            <button type="button" onClick={() => setExpenseOpen(true)}
              className="rounded-lg border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors">
              💳 Crear gasto
            </button>
            <div className="flex gap-1 justify-end">
              <button type="button" onClick={() => setEditOpen(true)}
                className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                aria-label="Editar">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-red-400 disabled:opacity-40 transition-colors"
                aria-label="Eliminar">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: Marcar comprada ───────────────────────────────────────────── */}
      {purchaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) setPurchaseOpen(false); }}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 dark:border dark:border-[#27272a]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-[#27272a]">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Marcar como comprada</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{ticket.title}</p>
              </div>
              <button onClick={() => setPurchaseOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">✕</button>
            </div>
            <div className="flex flex-col gap-4 px-5 py-4">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>¿Quién la compró? <span className="text-red-500">*</span></label>
                <select value={purchasedBy} onChange={(e) => setPurchasedBy(e.target.value)} className={selectCls}>
                  <option value="">— Seleccionar —</option>
                  {participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setPurchaseOpen(false)} disabled={purchaseLoading}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-[#3f3f46] dark:text-zinc-400 dark:hover:bg-white/5">
                  Cancelar
                </button>
                <button type="button" onClick={handleMarkPurchased} disabled={purchaseLoading}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50">
                  {purchaseLoading ? "Guardando…" : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Crear gasto ───────────────────────────────────────────────── */}
      {expenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) setExpenseOpen(false); }}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 dark:border dark:border-[#27272a]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-[#27272a]">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Crear gasto</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {ticket.scope === "GROUP"
                    ? `División equitativa · ${participants.length} participante${participants.length !== 1 ? "s" : ""}`
                    : "Gasto individual"}
                </p>
              </div>
              <button onClick={() => setExpenseOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">✕</button>
            </div>
            <div className="flex flex-col gap-4 px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Monto total <span className="text-red-500">*</span></label>
                  <input type="text" inputMode="numeric" placeholder="0"
                    value={fmtInput(amountValue, currency)}
                    onChange={(e) => setAmountValue(parseInputVal(e.target.value, currency))}
                    className={inputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Moneda</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectCls}>
                    {CURRENCY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {expenseAmount > 0 && ticket.scope === "GROUP" && participants.length > 0 && (
                <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3 dark:bg-[#1f2023] dark:border-[#27272a]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Por persona ({participants.length})</span>
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 tabular-nums">
                      {fmtAmount(perPerson, currency as Currency)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className={labelCls}>¿Quién pagó? <span className="text-red-500">*</span></label>
                <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className={selectCls}>
                  <option value="">— Seleccionar —</option>
                  {participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setExpenseOpen(false)} disabled={expenseLoading}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-[#3f3f46] dark:text-zinc-400 dark:hover:bg-white/5">
                  Cancelar
                </button>
                <button type="button" onClick={handleCreateExpense} disabled={expenseLoading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                  {expenseLoading ? "Creando…" : "Crear gasto"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <EditTicketForm
        tripId={tripId}
        ticket={ticket}
        activities={activities}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}
