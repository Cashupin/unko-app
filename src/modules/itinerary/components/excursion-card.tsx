"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { CreateActivityForm } from "@/modules/itinerary/components/create-activity-form";

type ExcursionData = {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  date: string | null;
};

function fmtDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", {
    weekday: "long", day: "numeric", month: "long",
  });
}

export function ExcursionCard({
  excursion,
  tripId,
  activityCount,
  activitiesSlot,
  canEdit,
  isAdmin,
}: {
  excursion: ExcursionData;
  tripId: string;
  activityCount: number;
  activitiesSlot: React.ReactNode;
  canEdit: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();

  // ── Date assignment ──────────────────────────────────────────────────────────
  const [dateOpen, setDateOpen] = useState(false);
  const [dateValue, setDateValue] = useState(excursion.date ?? "");
  const [dateLoading, setDateLoading] = useState(false);

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(excursion.title);
  const [editDescription, setEditDescription] = useState(excursion.description ?? "");
  const [editNotes, setEditNotes] = useState(excursion.notes ?? "");
  const [editLoading, setEditLoading] = useState(false);

  // ── Collapse (persiste en localStorage por excursión) ────────────────────────
  const collapseKey = `itin-exc-${excursion.id}`;
  const [isCollapsed, setIsCollapsed] = useState(false);
  useEffect(() => {
    setIsCollapsed(localStorage.getItem(collapseKey) === "true");
  }, [collapseKey]);

  // ── Delete ───────────────────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState(false);

  async function handleAssignDate() {
    setDateLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/excursions/${excursion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateValue || null }),
      });
      if (!res.ok) { toast.error("Error al asignar fecha"); return; }
      setDateOpen(false);
      router.refresh();
      toast.success(
        dateValue
          ? `Fecha asignada${activityCount > 0 ? ` — ${activityCount} actividad${activityCount !== 1 ? "es" : ""} actualizada${activityCount !== 1 ? "s" : ""}` : ""}`
          : "Fecha eliminada"
      );
    } catch {
      toast.error("Error de red");
    } finally {
      setDateLoading(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTitle.trim()) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/excursions/${excursion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), description: editDescription.trim() || null, notes: editNotes.trim() || null }),
      });
      if (!res.ok) { toast.error("Error al guardar"); return; }
      setEditOpen(false);
      router.refresh();
      toast.success("Excursión actualizada");
    } catch {
      toast.error("Error de red");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${excursion.title}"? Las actividades vinculadas no se eliminarán.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/trips/${tripId}/excursions/${excursion.id}`, { method: "DELETE" });
      router.refresh();
      toast.success("Excursión eliminada");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(false);
    }
  }

  const hasDate = !!excursion.date;

  const inputCls = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-[#3f3f46] dark:bg-[#27272a] dark:text-zinc-100 dark:placeholder-zinc-600 dark:focus:ring-zinc-600";
  const labelCls = "text-xs font-medium text-zinc-600 dark:text-zinc-400";

  return (
    <>
      <div className={`rounded-2xl border transition-colors ${
        hasDate ? "border-blue-800/40 bg-blue-950/20" : "border-[#27272a] bg-[#18191c]"
      }`}>
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-zinc-100">🗺️ {excursion.title}</p>
              {hasDate ? (
                <span className="rounded-full border border-blue-700/50 bg-blue-900/30 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                  📅 {fmtDate(excursion.date!)}
                </span>
              ) : (
                <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                  Sin fecha
                </span>
              )}
              <span className="text-[10px] text-zinc-600">
                {activityCount} actividad{activityCount !== 1 ? "es" : ""}
              </span>
            </div>
            {excursion.description && (
              <p className="mt-1 text-xs text-zinc-400">{excursion.description}</p>
            )}
            {excursion.notes && (
              <p className="mt-1.5 flex items-start gap-1 text-xs text-amber-400/80">
                <span className="shrink-0 mt-px">⚠️</span>
                {excursion.notes}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => { setDateValue(excursion.date ?? ""); setDateOpen(true); }}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    hasDate
                      ? "border-blue-700/50 bg-blue-900/20 text-blue-400 hover:bg-blue-900/40"
                      : "border-emerald-700/50 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40"
                  }`}
                >
                  {hasDate ? "📅 Cambiar fecha" : "📅 Asignar fecha"}
                </button>
                <button type="button" onClick={() => { setEditTitle(excursion.title); setEditDescription(excursion.description ?? ""); setEditNotes(excursion.notes ?? ""); setEditOpen(true); }}
                  className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                  aria-label="Editar">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                {isAdmin && (
                  <button type="button" onClick={handleDelete} disabled={deleting}
                    className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-red-400 disabled:opacity-40 transition-colors"
                    aria-label="Eliminar">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={() => setIsCollapsed((v) => {
                const next = !v;
                localStorage.setItem(collapseKey, String(next));
                return next;
              })}
              aria-label={isCollapsed ? "Expandir" : "Colapsar"}
              className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400 transition-colors"
            >
              <svg
                className={`h-3.5 w-3.5 transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Activity list ───────────────────────────────────────────────────── */}
        {!isCollapsed && (
          <div className="border-t border-zinc-800/60 px-3 py-3 flex flex-col gap-2">
            {activityCount === 0 && (
              <p className="text-xs text-zinc-600 italic px-1 py-1">
                Sin actividades todavía — añade la primera abajo
              </p>
            )}
            {activitiesSlot}

            {/* Add activity */}
            {canEdit && (
              <div className="mt-1 px-1">
                <CreateActivityForm
                  tripId={tripId}
                  compact
                  overlayZIndex="z-[60]"
                  excursionId={excursion.id}
                  excursionTitle={excursion.title}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal: Asignar fecha ─────────────────────────────────────────────── */}
      {dateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) setDateOpen(false); }}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 dark:border dark:border-[#27272a]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-[#27272a]">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {hasDate ? "Cambiar fecha" : "Asignar fecha"}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">{excursion.title}</p>
              </div>
              <button onClick={() => setDateOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">✕</button>
            </div>
            <div className="flex flex-col gap-4 px-5 py-4">
              {activityCount > 0 && (
                <div className="rounded-xl bg-blue-950/30 border border-blue-800/30 px-4 py-3">
                  <p className="text-xs text-blue-300">
                    Se actualizarán <strong>{activityCount}</strong> actividad{activityCount !== 1 ? "es" : ""} a esta fecha automáticamente.
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Fecha</label>
                <DatePicker value={dateValue} onChange={setDateValue} placeholder="Sin fecha" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setDateOpen(false)} disabled={dateLoading}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-[#3f3f46] dark:text-zinc-400 dark:hover:bg-white/5">
                  Cancelar
                </button>
                <button type="button" onClick={handleAssignDate} disabled={dateLoading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                  {dateLoading ? "Guardando…" : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar ────────────────────────────────────────────────────── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) setEditOpen(false); }}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 dark:border dark:border-[#27272a]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-[#27272a]">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Editar excursión</h2>
              <button onClick={() => setEditOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">✕</button>
            </div>
            <form onSubmit={handleEdit} className="flex flex-col gap-4 px-5 py-4">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Destino / nombre <span className="text-red-500">*</span></label>
                <input autoFocus type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Descripción</label>
                <textarea rows={2} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className={`${inputCls} resize-none`} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-amber-600 dark:text-amber-400">⚠️ Restricción / nota</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ej: No sábados — templo cerrado"
                  className={`${inputCls} resize-none placeholder:text-zinc-500`}
                />
                <p className="text-[10px] text-zinc-500">Se muestra como advertencia en la tarjeta</p>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setEditOpen(false)} disabled={editLoading}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-[#3f3f46] dark:text-zinc-400 dark:hover:bg-white/5">
                  Cancelar
                </button>
                <button type="submit" disabled={editLoading || !editTitle.trim()}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                  {editLoading ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
