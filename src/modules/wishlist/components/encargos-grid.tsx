"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { EncargoDetailSheet } from "./encargo-detail-sheet";
import type { FriendRequest } from "../types";

// ── Paleta (igual que wishlist) ───────────────────────────────────────────────

const PALETTE = [
  "#f59e0b", "#6366f1", "#ec4899", "#10b981",
  "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6",
];

function buildColorMap(requests: FriendRequest[]): Map<string, string> {
  const map = new Map<string, string>();
  let idx = 0;
  for (const r of requests) {
    if (!map.has(r.friendLinkId)) {
      map.set(r.friendLinkId, PALETTE[idx % PALETTE.length] ?? PALETTE[0]);
      idx++;
    }
  }
  return map;
}

// ── Placeholder (clon de wishlist, icono de regalo) ───────────────────────────

function PlaceholderCard({ color }: { color: string }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${color}22, ${color}44)` }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.25"
        strokeLinecap="round" strokeLinejoin="round" className="h-9 w-9 opacity-70">
        <path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/>
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
      </svg>
    </div>
  );
}

// ── Chip (clon exacto de wishlist) ────────────────────────────────────────────

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-transparent bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type BoughtFilter = "all" | "pending" | "bought";

type Props = {
  tripId: string;
  requests: FriendRequest[]; // solo APPROVED, controlado desde EncargosSubtabClient
  onUpdate: (id: string, changes: Partial<FriendRequest>) => void;
};

export function EncargosGrid({ tripId, requests, onUpdate }: Props) {
  const [boughtFilter, setBoughtFilter] = useState<BoughtFilter>("all");
  const [friendFilter, setFriendFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const colorMap = useMemo(() => buildColorMap(requests), [requests]);

  // Deriva el selected siempre desde los requests actuales (nunca stale)
  const selected = useMemo(
    () => (selectedId ? requests.find((r) => r.id === selectedId) ?? null : null),
    [selectedId, requests],
  );

  // Amigos distintos para chips de filtro
  const friends = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of requests) {
      if (!seen.has(r.friendLinkId)) seen.set(r.friendLinkId, r.friendName);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !(r.notes ?? "").toLowerCase().includes(q)) return false;
      if (friendFilter !== "all" && r.friendLinkId !== friendFilter) return false;
      if (boughtFilter === "pending") return !r.bought;
      if (boughtFilter === "bought")  return r.bought;
      return true;
    });
  }, [requests, boughtFilter, friendFilter, search]);

  async function handleToggleBought(req: FriendRequest, cost?: number | null) {
    const res = await fetch(`/api/trips/${tripId}/wishlist/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toggleBought: true, cost: cost ?? null }),
    });
    if (!res.ok) { toast.error("Error al actualizar"); return; }
    const updated = await res.json() as { bought: boolean; boughtAt: string | null; cost: number | null };
    onUpdate(req.id, { bought: updated.bought, boughtAt: updated.boughtAt, cost: updated.cost });
    toast.success(updated.bought ? "Marcado como comprado ✓" : "Marcado como pendiente");
  }

  const boughtCount  = requests.filter((r) => r.bought).length;
  const pendingCount = requests.filter((r) => !r.bought).length;

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <span className="text-4xl">🎁</span>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          No hay encargos aprobados aún
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* ── Filtros ── */}
      <div className="mb-4 flex flex-col gap-2">
        {/* Buscador */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar en encargos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-8 pr-8 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          <Chip active={boughtFilter === "all"} onClick={() => setBoughtFilter("all")}>Todos</Chip>
          <Chip active={boughtFilter === "pending"} onClick={() => setBoughtFilter("pending")}>
            <span className="text-[10px]">🔴</span> Pendientes
          </Chip>
          <Chip active={boughtFilter === "bought"} onClick={() => setBoughtFilter("bought")}>
            <span className="text-[10px]">✅</span> Comprados
          </Chip>
        </div>

        {/* Friend filter */}
        {friends.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            <Chip active={friendFilter === "all"} onClick={() => setFriendFilter("all")}>Todos</Chip>
            {friends.map((f) => {
              const color = colorMap.get(f.id) ?? "#f97316";
              return (
                <Chip key={f.id} active={friendFilter === f.id} onClick={() => setFriendFilter(f.id)}>
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ background: color }}
                  >
                    {f.name.charAt(0).toUpperCase()}
                  </span>
                  {f.name}
                </Chip>
              );
            })}
          </div>
        )}
      </div>

      {/* Contador */}
      <div className="mb-3">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {search.trim()
            ? `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}`
            : `${filtered.length} ${filtered.length === 1 ? "item" : "items"}`}
        </span>
      </div>

      {/* ── Grid (clon exacto de wishlist) ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <span className="text-4xl">🎁</span>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {search.trim() ? `Sin resultados para "${search.trim()}"` : "Sin encargos para este filtro"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 md:grid-cols-5">
          {filtered.map((req) => {
            const color = colorMap.get(req.friendLinkId) ?? "#f97316";
            return (
              <button
                key={req.id}
                onClick={() => setSelectedId(req.id)}
                className="group relative aspect-square overflow-hidden bg-zinc-100 focus:outline-none dark:bg-zinc-800"
              >
                {req.imageUrl ? (
                  <img
                    src={req.imageUrl}
                    alt={req.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-active:scale-95"
                    loading="lazy"
                  />
                ) : (
                  <PlaceholderCard color={color} />
                )}

                {/* Gradiente solo si tiene imagen */}
                {req.imageUrl && (
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                )}

                {/* Badge comprado */}
                {req.bought && (
                  <div className="absolute left-1.5 top-1.5 rounded-md bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">✓</div>
                )}

                {/* Círculo del amigo (top-right, como facepile) */}
                <div
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-white text-[9px] font-bold text-white shadow-sm dark:border-zinc-800"
                  style={{ background: color }}
                  title={req.friendName}
                >
                  {req.bought ? "✓" : req.friendName.charAt(0).toUpperCase()}
                </div>

                {/* Nombre + costo en la parte inferior */}
                <div className="absolute bottom-1.5 left-1.5 right-1.5">
                  <p
                    className="line-clamp-2 text-left text-[10px] font-semibold leading-tight"
                    style={req.imageUrl ? { color: "white", textShadow: "0 1px 3px rgba(0,0,0,.5)" } : {}}
                  >
                    {req.name}
                  </p>
                  {req.bought && req.cost != null && (
                    <p
                      className="mt-0.5 text-[9px] font-semibold"
                      style={req.imageUrl ? { color: "rgba(255,255,255,0.85)", textShadow: "0 1px 2px rgba(0,0,0,.5)" } : { color: "#10b981" }}
                    >
                      {req.cost.toLocaleString("es-CL")}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Detail sheet ── */}
      {selected && (
        <EncargoDetailSheet
          req={selected}
          tripId={tripId}
          color={colorMap.get(selected.friendLinkId) ?? "#f97316"}
          onClose={() => setSelectedId(null)}
          onToggleBought={handleToggleBought}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
