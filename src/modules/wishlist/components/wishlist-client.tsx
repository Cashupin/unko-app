"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { WishlistDetailSheet } from "./wishlist-detail-sheet";
import { AddWishlistItemForm } from "./add-wishlist-item-form";
import type { WishlistItem, WishlistGroup, WishlistParticipant } from "../types";

// ── Paleta ───────────────────────────────────────────────────────────────────

const PALETTE = [
  "#f59e0b", "#6366f1", "#ec4899", "#10b981",
  "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6",
];

export function participantColor(participantId: string, participants: WishlistParticipant[]): string {
  const idx = participants.findIndex((p) => p.id === participantId);
  return PALETTE[idx % PALETTE.length] ?? PALETTE[0];
}

export function participantInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

// ── Agrupar items ────────────────────────────────────────────────────────────

function buildGroups(items: WishlistItem[]): WishlistGroup[] {
  const map = new Map<string, WishlistItem[]>();
  for (const item of items) {
    const key = item.originItemId ?? item.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  const groups: WishlistGroup[] = [];
  for (const [rootId, members] of map) {
    const root = members.find((i) => i.id === rootId) ?? members[0];
    groups.push({ rootId, root, all: members });
  }
  // Orden: por createdAt del root
  return groups.sort((a, b) => a.root.createdAt.localeCompare(b.root.createdAt));
}

// ── Placeholder ──────────────────────────────────────────────────────────────

function PlaceholderCard({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${color}22, ${color}44)` }}>
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.25"
        strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9 opacity-70">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    </div>
  );
}

// ── Facepile ─────────────────────────────────────────────────────────────────

function Facepile({ group, participants }: { group: WishlistGroup; participants: WishlistParticipant[] }) {
  const visible = group.all.slice(0, 4);
  const extra = group.all.length - 4;
  return (
    <div className="absolute right-1.5 top-1.5 flex">
      {visible.map((item, i) => {
        const color = participantColor(item.ownedByParticipantId, participants);
        const initial = participantInitial(item.ownedByParticipant.name);
        return (
          <div
            key={item.id}
            className="flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-white text-[9px] font-bold text-white shadow-sm"
            style={{ background: color, marginLeft: i === 0 ? 0 : -6, zIndex: visible.length - i }}
            title={item.bought ? `${item.ownedByParticipant.name} ✓` : item.ownedByParticipant.name}
          >
            {item.bought ? "✓" : initial}
          </div>
        );
      })}
      {extra > 0 && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-white bg-zinc-500 text-[8px] font-bold text-white shadow-sm" style={{ marginLeft: -6 }}>
          +{extra}
        </div>
      )}
    </div>
  );
}

// ── Filter chips ─────────────────────────────────────────────────────────────

type StatusFilter = "all" | "pending" | "bought";

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
      active
        ? "border-transparent bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
        : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
    }`}>
      {children}
    </button>
  );
}

// ── Persistence ───────────────────────────────────────────────────────────────

const STATUS_KEY = (id: string) => `wishlist-status-${id}`;
const PERSON_KEY  = (id: string) => `wishlist-person-${id}`;
function readStorage(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
}

// ── Live toast ───────────────────────────────────────────────────────────────

const TOAST_MESSAGES: Record<string, (actor: string, item: string) => string> = {
  added:    (a, i) => `${a} agregó "${i}" a la wishlist`,
  wanted:   (a, i) => `${a} también quiere "${i}"`,
  unwanted: (a, i) => `${a} ya no quiere "${i}"`,
  bought:   (a, i) => `${a} compró "${i}" ✓`,
  unbought: (a, i) => `${a} desmarcó "${i}"`,
  updated:  (a, i) => `${a} actualizó "${i}"`,
  deleted:  (a, i) => `${a} eliminó "${i}" de la wishlist`,
};

function WishlistLiveToast({ tripId, myParticipantId }: { tripId: string; myParticipantId: string }) {
  useEffect(() => {
    const channel = supabase
      .channel(`trip:${tripId}`)
      .on("broadcast", { event: "update" }, ({ payload }) => {
        if (payload?.type !== "wishlist") return;
        if (payload?.actorId === myParticipantId) return;
        const fmt = TOAST_MESSAGES[payload?.action as string];
        if (fmt) toast(fmt(payload.actorName as string, payload.itemName as string), { duration: 4000 });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tripId, myParticipantId]);
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  tripId: string;
  myParticipantId: string;
  canEdit: boolean;
  initialItems: WishlistItem[];
  participants: WishlistParticipant[];
};

export function WishlistClient({ tripId, myParticipantId, canEdit, initialItems, participants }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>(initialItems);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => readStorage(STATUS_KEY(tripId), "all") as StatusFilter);
  const [personFilter, setPersonFilter] = useState<string>(() => readStorage(PERSON_KEY(tripId), "all"));
  const [selectedGroup, setSelectedGroup] = useState<WishlistGroup | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");

  function changeStatusFilter(val: StatusFilter) { setStatusFilter(val); localStorage.setItem(STATUS_KEY(tripId), val); }
  function changePersonFilter(val: string) { setPersonFilter(val); localStorage.setItem(PERSON_KEY(tripId), val); }

  // Agrupar y filtrar
  const allGroups = useMemo(() => buildGroups(items), [items]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allGroups.filter((g) => {
      if (q && !g.root.name.toLowerCase().includes(q) && !(g.root.notes ?? "").toLowerCase().includes(q)) return false;
      const relevantItems = personFilter === "all" ? g.all : g.all.filter((i) => i.ownedByParticipantId === personFilter);
      if (relevantItems.length === 0) return false;
      if (statusFilter === "all") return true;
      return relevantItems.some((i) => statusFilter === "bought" ? i.bought : !i.bought);
    });
  }, [allGroups, personFilter, statusFilter, search]);

  // ── API helpers ──────────────────────────────────────────────────────────

  const handleAdd = useCallback(async (data: { name: string; notes: string; imageUrl: string }) => {
    const res = await fetch(`/api/trips/${tripId}/wishlist`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error("Error al guardar el item"); return; }
    const newItem: WishlistItem = await res.json();
    setItems((prev) => [...prev, newItem]);
    setAddOpen(false);
    toast.success("Item agregado a tu wishlist");
  }, [tripId]);

  const handleToggleBought = useCallback(async (item: WishlistItem) => {
    const res = await fetch(`/api/trips/${tripId}/wishlist/${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toggleBought: true }),
    });
    if (!res.ok) { toast.error("Error al actualizar"); return; }
    const updated: WishlistItem = await res.json();
    setItems((prev) => prev.map((i) => i.id === updated.id ? { ...i, bought: updated.bought, boughtAt: updated.boughtAt } : i));
    setSelectedGroup((prev) => prev ? { ...prev, all: prev.all.map((i) => i.id === updated.id ? { ...i, bought: updated.bought, boughtAt: updated.boughtAt } : i) } : null);
    toast.success(updated.bought ? "Marcado como comprado" : "Marcado como pendiente");
  }, [tripId]);

  const handleUpdate = useCallback(async (item: WishlistItem, data: { name: string; notes: string; imageUrl: string }) => {
    const res = await fetch(`/api/trips/${tripId}/wishlist/${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, notes: data.notes || null, imageUrl: data.imageUrl || null }),
    });
    if (!res.ok) { toast.error("Error al guardar los cambios"); return; }
    const updated: WishlistItem = await res.json();
    setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i));
    setSelectedGroup((prev) => {
      if (!prev) return null;
      const newAll = prev.all.map((i) => i.id === updated.id ? updated : i);
      const newRoot = updated.originItemId === null ? updated : prev.root;
      return { ...prev, root: newRoot, all: newAll };
    });
    toast.success("Item actualizado");
  }, [tripId]);

  const handleDelete = useCallback(async (item: WishlistItem) => {
    const res = await fetch(`/api/trips/${tripId}/wishlist/${item.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error al eliminar"); return; }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setSelectedGroup((prev) => {
      if (!prev) return null;
      const newAll = prev.all.filter((i) => i.id !== item.id);
      if (newAll.length === 0) return null;
      // Si se eliminó el root, el nuevo root es la copia más antigua
      const newRoot = item.id === prev.rootId ? newAll[0] : prev.root;
      return { ...prev, rootId: newRoot.id, root: newRoot, all: newAll };
    });
    toast.success("Item eliminado");
    router.refresh();
  }, [tripId, router]);

  const handleWant = useCallback(async (rootId: string) => {
    const res = await fetch(`/api/trips/${tripId}/wishlist/${rootId}/want`, { method: "POST" });
    if (res.status === 409) { toast.error("Ya lo tienes en tu wishlist"); return; }
    if (!res.ok) { toast.error("Error al agregar"); return; }
    const newItem: WishlistItem = await res.json();
    setItems((prev) => [...prev, newItem]);
    setSelectedGroup((prev) => prev ? { ...prev, all: [...prev.all, newItem] } : null);
    toast.success("¡Agregado a tu wishlist!");
  }, [tripId]);

  const handleUnwant = useCallback(async (rootId: string, myItem: WishlistItem) => {
    const res = await fetch(`/api/trips/${tripId}/wishlist/${rootId}/want`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error al eliminar"); return; }
    setItems((prev) => prev.filter((i) => i.id !== myItem.id));
    setSelectedGroup((prev) => {
      if (!prev) return null;
      const newAll = prev.all.filter((i) => i.id !== myItem.id);
      return newAll.length === 0 ? null : { ...prev, all: newAll };
    });
    toast.success("Eliminado de tu wishlist");
  }, [tripId]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0">
      <WishlistLiveToast tripId={tripId} myParticipantId={myParticipantId} />

      {/* Filtros */}
      <div className="flex flex-col gap-2 mb-4">
        {/* Buscador */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar en wishlist..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-8 pr-8 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          <Chip active={statusFilter === "all"} onClick={() => changeStatusFilter("all")}>Todos</Chip>
          <Chip active={statusFilter === "pending"} onClick={() => changeStatusFilter("pending")}>
            <span className="text-[10px]">🔴</span> Pendientes
          </Chip>
          <Chip active={statusFilter === "bought"} onClick={() => changeStatusFilter("bought")}>
            <span className="text-[10px]">✅</span> Comprados
          </Chip>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          <Chip active={personFilter === "all"} onClick={() => changePersonFilter("all")}>Todos</Chip>
          {participants.map((p) => {
            const color = participantColor(p.id, participants);
            return (
              <Chip key={p.id} active={personFilter === p.id} onClick={() => changePersonFilter(p.id)}>
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: color }}>
                  {participantInitial(p.name)}
                </span>
                {p.name}
              </Chip>
            );
          })}
        </div>
      </div>

      {/* Contador + botón agregar */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {search.trim() ? `${filteredGroups.length} resultado${filteredGroups.length !== 1 ? "s" : ""}` : `${filteredGroups.length} ${filteredGroups.length === 1 ? "item" : "items"}`}
        </span>
        {canEdit && (
          <button onClick={() => setAddOpen(true)}
            className="hidden md:flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Agregar item
          </button>
        )}
      </div>

      {/* Grid */}
      {filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <span className="text-4xl">🛍️</span>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {items.length === 0 ? "La wishlist está vacía" : search.trim() ? `Sin resultados para "${search.trim()}"` : "Sin items para este filtro"}
          </p>
          {items.length === 0 && canEdit && (
            <button onClick={() => setAddOpen(true)}
              className="mt-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
              Agregar el primero
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 md:grid-cols-5">
          {filteredGroups.map((group) => {
            const color = participantColor(group.root.ownedByParticipantId, participants);
            const allBought = group.all.every((i) => i.bought);
            return (
              <button key={group.rootId} onClick={() => setSelectedGroup(group)}
                className="group relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800 focus:outline-none">
                {group.root.imageUrl ? (
                  <img src={group.root.imageUrl} alt={group.root.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-active:scale-95"
                    loading="lazy" />
                ) : (
                  <PlaceholderCard color={color} />
                )}

                {group.root.imageUrl && (
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                )}

                {/* badge todos comprados */}
                {allBought && (
                  <div className="absolute left-1.5 top-1.5 rounded-md bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">✓</div>
                )}

                {/* Facepile */}
                <Facepile group={group} participants={participants} />

                {/* nombre */}
                <p className="absolute bottom-1.5 left-1.5 right-1.5 line-clamp-2 text-left text-[10px] font-semibold leading-tight"
                  style={group.root.imageUrl ? { color: "white", textShadow: "0 1px 3px rgba(0,0,0,.5)" } : {}}>
                  {group.root.name}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* FAB mobile */}
      {canEdit && (
        <button onClick={() => setAddOpen(true)}
          className="fixed bottom-20 right-4 z-20 flex items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-transform active:scale-90 dark:bg-zinc-100 dark:text-zinc-900 md:hidden"
          style={{ width: 52, height: 52 }} aria-label="Agregar a wishlist">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      {/* Detail sheet */}
      {selectedGroup && (
        <WishlistDetailSheet
          group={selectedGroup}
          participants={participants}
          myParticipantId={myParticipantId}
          canEdit={canEdit}
          onClose={() => setSelectedGroup(null)}
          onToggleBought={handleToggleBought}
          onUpdate={handleUpdate}
          onDelete={(item) => {
            toast("¿Eliminar este item?", {
              action: { label: "Eliminar", onClick: () => handleDelete(item) },
              cancel: { label: "Cancelar", onClick: () => {} },
            });
          }}
          onWant={() => handleWant(selectedGroup.rootId)}
          onUnwant={(myItem) => handleUnwant(selectedGroup.rootId, myItem)}
        />
      )}

      {/* Add form */}
      {addOpen && canEdit && (
        <AddWishlistItemForm tripId={tripId} onClose={() => setAddOpen(false)} onSave={handleAdd} />
      )}
    </div>
  );
}
