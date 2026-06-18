"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { fmtAmount } from "@/lib/constants";
import { PassForm } from "@/modules/itinerary/components/pass-form";
import { TransportForm, TRANSPORT_ICONS, TRANSPORT_LABELS } from "@/modules/itinerary/components/transport-form";

type Pass = {
  id: string;
  name: string;
  validFrom: string | null;
  validTo: string | null;
  cost: number | null;
  currency: string;
  isPaid: boolean;
  notes: string | null;
  transportCount: number;
};

type Transport = {
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
  coveredByPass: { id: string; name: string } | null;
};

function formatDateShort(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function formatDateRange(from: string | null, to: string | null): string {
  if (!from && !to) return "";
  if (from && to) return `${formatDateShort(from)} → ${formatDateShort(to)}`;
  if (from) return `desde ${formatDateShort(from)}`;
  return `hasta ${formatDateShort(to)}`;
}

function groupTransportsByDate(transports: Transport[]): [string, Transport[]][] {
  const map = new Map<string, Transport[]>();
  for (const t of transports) {
    const key = t.departureDate ? t.departureDate.slice(0, 10) : "__nodate__";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return [...map.entries()];
}

function dayLabel(dateKey: string): string {
  if (dateKey === "__nodate__") return "Sin fecha";
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "long" }).toUpperCase();
}

export function TransportPanelClient({
  tripId,
  canEdit,
  defaultCurrency,
  tripStartDate,
  tripEndDate,
  passes,
  transports,
  pendingLines,
}: {
  tripId: string;
  canEdit: boolean;
  defaultCurrency: string;
  tripStartDate?: string;
  tripEndDate?: string;
  passes: Pass[];
  transports: Transport[];
  pendingLines: string[];
}) {
  const router = useRouter();
  const [showPassModal, setShowPassModal] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [editingPass, setEditingPass] = useState<Pass | null>(null);
  const [editingTransport, setEditingTransport] = useState<Transport | null>(null);

  const passOptions = passes.map((p) => ({ id: p.id, name: p.name }));
  const grouped = groupTransportsByDate(transports);

  async function deletePass(passId: string, name: string) {
    toast(`¿Eliminar pase "${name}"?`, {
      action: {
        label: "Eliminar",
        onClick: async () => {
          const res = await fetch(`/api/passes/${passId}`, { method: "DELETE" });
          if (res.ok) { toast.success("Pase eliminado"); router.refresh(); }
          else toast.error("Error al eliminar pase");
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  }

  async function deleteTransport(transportId: string, label: string) {
    toast(`¿Eliminar "${label}"?`, {
      action: {
        label: "Eliminar",
        onClick: async () => {
          const res = await fetch(`/api/transports/${transportId}`, { method: "DELETE" });
          if (res.ok) { toast.success("Transporte eliminado"); router.refresh(); }
          else toast.error("Error al eliminar transporte");
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  }

  async function togglePassPaid(pass: Pass) {
    const res = await fetch(`/api/passes/${pass.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaid: !pass.isPaid }),
    });
    if (res.ok) router.refresh();
    else toast.error("Error al actualizar pase");
  }

  async function toggleTransportPaid(t: Transport) {
    const res = await fetch(`/api/transports/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaid: !t.isPaid }),
    });
    if (res.ok) router.refresh();
    else toast.error("Error al actualizar transporte");
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      {canEdit && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-zinc-500">
            {passes.length > 0 ? `${passes.length} pase${passes.length !== 1 ? "s" : ""} · ` : ""}
            {transports.length} tramo{transports.length !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => { setEditingPass(null); setShowPassModal(true); }}
              className="rounded-xl border border-zinc-700 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              + Pase
            </button>
            <button
              onClick={() => { setEditingTransport(null); setShowTransportModal(true); }}
              className="rounded-xl bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-white transition-colors"
            >
              + Transporte
            </button>
          </div>
        </div>
      )}

      {/* Summary card */}
      {pendingLines.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1">Total pendiente de pago</p>
            <p className="text-2xl font-extrabold text-zinc-100">{pendingLines[0]}</p>
            {pendingLines.slice(1).map((line) => (
              <p key={line} className="text-sm font-semibold text-zinc-400">{line}</p>
            ))}
          </div>
          <div className="text-right text-xs text-zinc-600">
            {passes.filter((p) => !p.isPaid && p.cost).length > 0 && (
              <p>{passes.filter((p) => !p.isPaid && p.cost).length} pase{passes.filter((p) => !p.isPaid && p.cost).length !== 1 ? "s" : ""} sin pagar</p>
            )}
            {transports.filter((t) => !t.isPaid && !t.coveredByPassId && t.cost).length > 0 && (
              <p>{transports.filter((t) => !t.isPaid && !t.coveredByPassId && t.cost).length} tramo{transports.filter((t) => !t.isPaid && !t.coveredByPassId && t.cost).length !== 1 ? "s" : ""} sin pagar</p>
            )}
          </div>
        </div>
      )}

      {/* Passes */}
      {passes.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Pases</p>
          <div className="flex flex-col gap-2">
            {passes.map((pass) => (
              <div key={pass.id} className="group flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3.5 transition-colors hover:border-zinc-700">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-base">📦</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-100">{pass.name}</p>
                  <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                    {(pass.validFrom || pass.validTo) && (
                      <span className="text-xs text-zinc-500">{formatDateRange(pass.validFrom, pass.validTo)}</span>
                    )}
                    {pass.transportCount > 0 && (
                      <span className="text-xs text-zinc-600">{pass.transportCount} tramo{pass.transportCount !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {pass.cost ? (
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${pass.isPaid ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-300"}`}>
                      {pass.isPaid ? "✓ " : ""}{fmtAmount(pass.cost, pass.currency)}
                    </span>
                  ) : pass.isPaid ? (
                    <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400">✓ Pagado</span>
                  ) : null}
                  {canEdit && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {pass.cost && (
                        <button
                          onClick={() => togglePassPaid(pass)}
                          title={pass.isPaid ? "Marcar pendiente" : "Marcar pagado"}
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                        >
                          {pass.isPaid ? "↩" : "✓"}
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingPass(pass); setShowPassModal(true); }}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deletePass(pass.id, pass.name)}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-900/40 hover:text-red-400 transition-colors"
                      >
                        🗑
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transports grouped by day */}
      {transports.length > 0 ? (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Tramos</p>
          {grouped.map(([dateKey, items]) => (
            <div key={dateKey}>
              <div className="flex items-center gap-3 my-3">
                <div className="h-px flex-1 bg-zinc-800" />
                <span className="text-[10px] font-bold tracking-widest text-zinc-600">{dayLabel(dateKey)}</span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
              <div className="flex flex-col gap-2">
                {items.map((t) => (
                  <TransportRowItem
                    key={t.id}
                    transport={t}
                    canEdit={canEdit}
                    onEdit={() => { setEditingTransport(t); setShowTransportModal(true); }}
                    onDelete={() => deleteTransport(t.id, `${t.origin} → ${t.destination}`)}
                    onTogglePaid={() => toggleTransportPaid(t)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : passes.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-800 p-12 text-center">
          <p className="text-sm text-zinc-600">No hay transportes todavía.{canEdit ? " ¡Agrega el primero!" : ""}</p>
        </div>
      ) : null}

      {/* Pass modal */}
      {showPassModal && (
        <Modal title={editingPass ? "Editar pase" : "Nuevo pase"} onClose={() => { setShowPassModal(false); setEditingPass(null); }}>
          <PassForm
            tripId={tripId}
            defaultCurrency={defaultCurrency}
            tripStartDate={tripStartDate}
            tripEndDate={tripEndDate}
            initial={editingPass ?? undefined}
            onClose={() => { setShowPassModal(false); setEditingPass(null); }}
          />
        </Modal>
      )}

      {/* Transport modal */}
      {showTransportModal && (
        <Modal title={editingTransport ? "Editar transporte" : "Nuevo transporte"} onClose={() => { setShowTransportModal(false); setEditingTransport(null); }}>
          <TransportForm
            tripId={tripId}
            defaultCurrency={defaultCurrency}
            tripStartDate={tripStartDate}
            tripEndDate={tripEndDate}
            passes={passOptions}
            initial={editingTransport ?? undefined}
            onClose={() => { setShowTransportModal(false); setEditingTransport(null); }}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Transport row item ───────────────────────────────────────────────────────

function TransportRowItem({
  transport: t,
  canEdit,
  onEdit,
  onDelete,
  onTogglePaid,
}: {
  transport: Transport;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePaid: () => void;
}) {
  const icon = TRANSPORT_ICONS[t.type] ?? "🚌";
  const label = TRANSPORT_LABELS[t.type] ?? t.type;
  const isCovered = !!t.coveredByPassId;

  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3.5 transition-colors hover:border-zinc-700">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-base">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-100">
          {t.origin} <span className="text-zinc-600">→</span> {t.destination}
        </p>
        <div className="mt-0.5 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-600">{label}</span>
          {t.departureTime && (
            <span className="text-xs text-zinc-500">
              {t.departureTime}{t.arrivalTime ? ` → ${t.arrivalTime}${t.arrivalDate && t.departureDate && t.arrivalDate !== t.departureDate ? " +1" : ""}` : ""}
            </span>
          )}
          {isCovered && t.coveredByPass && (
            <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
              📦 {t.coveredByPass.name}
            </span>
          )}
          {t.notes && <span className="text-xs text-zinc-600 italic">{t.notes}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isCovered ? (
          <span className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-500">Incluido</span>
        ) : t.cost ? (
          <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${t.isPaid ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-300"}`}>
            {t.isPaid ? "✓ " : ""}{fmtAmount(t.cost, t.currency)}
          </span>
        ) : t.isPaid ? (
          <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400">✓ Pagado</span>
        ) : null}
        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isCovered && t.cost && (
              <button
                onClick={onTogglePaid}
                title={t.isPaid ? "Marcar pendiente" : "Marcar pagado"}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
              >
                {t.isPaid ? "↩" : "✓"}
              </button>
            )}
            <button onClick={onEdit} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 transition-colors">✏️</button>
            <button onClick={onDelete} className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-900/40 hover:text-red-400 transition-colors">🗑</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative z-10 w-full max-w-md rounded-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-100">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 transition-colors">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
