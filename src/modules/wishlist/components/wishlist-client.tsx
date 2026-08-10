"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { WishlistDetailSheet } from "./wishlist-detail-sheet";
import { AddWishlistItemForm } from "./add-wishlist-item-form";
import type { WishlistItem, WishlistParticipant } from "../types";

// Paleta de colores para badges de participantes
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

// ── Item card placeholder (sin foto) ────────────────────────────────────────

function PlaceholderCard({ color }: { color: string }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${color}22, ${color}44)` }}
    >
      <svg
        viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.25"
        strokeLinecap="round" strokeLinejoin="round"
        className="w-9 h-9 opacity-70"
      >
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    </div>
  );
}

// ── Filter chips ─────────────────────────────────────────────────────────────

type StatusFilter = "all" | "pending" | "bought";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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

// ── Main component ───────────────────────────────────────────────────────────

type Props = {
  tripId: string;
  myParticipantId: string;
  canEdit: boolean;
  initialItems: WishlistItem[];
  participants: WishlistParticipant[];
};

const STATUS_KEY = (tripId: string) => `wishlist-status-${tripId}`;
const PERSON_KEY  = (tripId: string) => `wishlist-person-${tripId}`;

function readStorage(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
}

export function WishlistClient({ tripId, myParticipantId, canEdit, initialItems, participants }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>(initialItems);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    () => readStorage(STATUS_KEY(tripId), "all") as StatusFilter,
  );
  const [personFilter, setPersonFilter] = useState<string>(
    () => readStorage(PERSON_KEY(tripId), "all"),
  );
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  function changeStatusFilter(val: StatusFilter) {
    setStatusFilter(val);
    localStorage.setItem(STATUS_KEY(tripId), val);
  }

  function changePersonFilter(val: string) {
    setPersonFilter(val);
    localStorage.setItem(PERSON_KEY(tripId), val);
  }

  const filtered = items.filter((i) => {
    const personOk = personFilter === "all" || i.ownedByParticipantId === personFilter;
    const statusOk =
      statusFilter === "all" ||
      (statusFilter === "bought" && i.bought) ||
      (statusFilter === "pending" && !i.bought);
    return personOk && statusOk;
  });

  // ── API helpers ────────────────────────────────────────────────────────────

  const handleAdd = useCallback(
    async (data: { name: string; notes: string; imageUrl: string }) => {
      const res = await fetch(`/api/trips/${tripId}/wishlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        toast.error("Error al guardar el item");
        return;
      }
      const newItem: WishlistItem = await res.json();
      setItems((prev) => [...prev, newItem]);
      setAddOpen(false);
      toast.success("Item agregado a tu wishlist");
    },
    [tripId],
  );

  const handleToggleBought = useCallback(
    async (item: WishlistItem) => {
      const res = await fetch(`/api/trips/${tripId}/wishlist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleBought: true }),
      });
      if (!res.ok) { toast.error("Error al actualizar"); return; }
      const updated: WishlistItem = await res.json();
      setItems((prev) => prev.map((i) => i.id === updated.id ? { ...i, bought: updated.bought, boughtAt: updated.boughtAt } : i));
      setSelectedItem((prev) => prev?.id === updated.id ? { ...prev, bought: updated.bought, boughtAt: updated.boughtAt } : prev);
      toast.success(updated.bought ? "Marcado como comprado" : "Marcado como pendiente");
    },
    [tripId],
  );

  const handleUpdate = useCallback(
    async (item: WishlistItem, data: { name: string; notes: string; imageUrl: string }) => {
      const res = await fetch(`/api/trips/${tripId}/wishlist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, notes: data.notes || null, imageUrl: data.imageUrl || null }),
      });
      if (!res.ok) { toast.error("Error al guardar los cambios"); return; }
      const updated: WishlistItem = await res.json();
      setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i));
      setSelectedItem(updated);
      toast.success("Item actualizado");
    },
    [tripId],
  );

  const handleDelete = useCallback(
    async (item: WishlistItem) => {
      const res = await fetch(`/api/trips/${tripId}/wishlist/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Error al eliminar");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setSelectedItem(null);
      toast.success("Item eliminado");
      router.refresh();
    },
    [tripId, router],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0">

      {/* Filtros */}
      <div className="flex flex-col gap-2 mb-4">
        {/* Estado */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          <Chip active={statusFilter === "all"} onClick={() => changeStatusFilter("all")}>Todos</Chip>
          <Chip active={statusFilter === "pending"} onClick={() => changeStatusFilter("pending")}>
            <span className="text-[10px]">🔴</span> Pendientes
          </Chip>
          <Chip active={statusFilter === "bought"} onClick={() => changeStatusFilter("bought")}>
            <span className="text-[10px]">✅</span> Comprados
          </Chip>
        </div>
        {/* Persona */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          <Chip active={personFilter === "all"} onClick={() => changePersonFilter("all")}>Todos</Chip>
          {participants.map((p) => {
            const color = participantColor(p.id, participants);
            return (
              <Chip key={p.id} active={personFilter === p.id} onClick={() => changePersonFilter(p.id)}>
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ background: color }}
                >
                  {participantInitial(p.name)}
                </span>
                {p.name}
              </Chip>
            );
          })}
        </div>
      </div>

      {/* Contador + botón agregar desktop */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {filtered.length} {filtered.length === 1 ? "item" : "items"}
        </span>
        {canEdit && (
          <button
            onClick={() => setAddOpen(true)}
            className="hidden md:flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Agregar item
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <span className="text-4xl">🛍️</span>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {items.length === 0 ? "La wishlist está vacía" : "Sin items para este filtro"}
          </p>
          {items.length === 0 && canEdit && (
            <button
              onClick={() => setAddOpen(true)}
              className="mt-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Agregar el primero
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 md:grid-cols-5">
          {filtered.map((item) => {
            const color = participantColor(item.ownedByParticipantId, participants);
            const initial = participantInitial(item.ownedByParticipant.name);
            return (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="group relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800 focus:outline-none"
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-active:scale-95"
                    loading="lazy"
                  />
                ) : (
                  <PlaceholderCard color={color} />
                )}

                {/* gradient overlay solo si hay foto */}
                {item.imageUrl && (
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                )}

                {/* badge comprado */}
                {item.bought && (
                  <div className="absolute left-1.5 top-1.5 rounded-md bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    ✓
                  </div>
                )}

                {/* badge dueño */}
                <div
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-white text-[9px] font-bold text-white shadow-sm"
                  style={{ background: color }}
                >
                  {initial}
                </div>

                {/* nombre */}
                <p
                  className="absolute bottom-1.5 left-1.5 right-7 line-clamp-2 text-left text-[10px] font-semibold leading-tight"
                  style={item.imageUrl ? { color: "white", textShadow: "0 1px 3px rgba(0,0,0,.5)" } : { color: "var(--tw-text-opacity)" }}
                >
                  {item.name}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* FAB mobile */}
      {canEdit && (
        <button
          onClick={() => setAddOpen(true)}
          className="fixed bottom-20 right-4 z-20 flex h-13 w-13 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-transform active:scale-90 dark:bg-zinc-100 dark:text-zinc-900 md:hidden"
          style={{ width: 52, height: 52 }}
          aria-label="Agregar a wishlist"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      {/* Detail sheet */}
      {selectedItem && (
        <WishlistDetailSheet
          item={selectedItem}
          participants={participants}
          isOwner={selectedItem.ownedByParticipantId === myParticipantId}
          onClose={() => setSelectedItem(null)}
          onToggleBought={() => handleToggleBought(selectedItem)}
          onUpdate={(data) => handleUpdate(selectedItem, data)}
          onDelete={() => {
            toast("¿Eliminar este item?", {
              action: {
                label: "Eliminar",
                onClick: () => handleDelete(selectedItem),
              },
              cancel: { label: "Cancelar", onClick: () => {} },
            });
          }}
        />
      )}

      {/* Add form sheet */}
      {addOpen && canEdit && (
        <AddWishlistItemForm
          tripId={tripId}
          onClose={() => setAddOpen(false)}
          onSave={handleAdd}
        />
      )}
    </div>
  );
}
