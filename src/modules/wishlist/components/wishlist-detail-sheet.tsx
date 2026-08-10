"use client";

import { useEffect, useState } from "react";
import { UploadPhoto } from "@/components/ui/upload-photo";
import { participantColor, participantInitial } from "./wishlist-client";
import type { WishlistItem, WishlistParticipant } from "../types";

function PlaceholderHero({ color }: { color: string }) {
  return (
    <div
      className="flex w-full items-center justify-center"
      style={{ aspectRatio: "16/9", background: `linear-gradient(135deg, ${color}22, ${color}44)` }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 opacity-60">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    </div>
  );
}

type Props = {
  item: WishlistItem;
  participants: WishlistParticipant[];
  isOwner: boolean;
  onClose: () => void;
  onToggleBought: () => void;
  onUpdate: (data: { name: string; notes: string; imageUrl: string }) => Promise<void>;
  onDelete: () => void;
};

export function WishlistDetailSheet({ item, participants, isOwner, onClose, onToggleBought, onUpdate, onDelete }: Props) {
  const color = participantColor(item.ownedByParticipantId, participants);
  const initial = participantInitial(item.ownedByParticipant.name);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editNotes, setEditNotes] = useState(item.notes ?? "");
  const [editImageUrl, setEditImageUrl] = useState(item.imageUrl ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditing(false);
    setEditName(item.name);
    setEditNotes(item.notes ?? "");
    setEditImageUrl(item.imageUrl ?? "");
  }, [item.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (editing) setEditing(false);
        else onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, editing]);

  async function handleSave() {
    if (!editName.trim()) return;
    setSaving(true);
    await onUpdate({ name: editName.trim(), notes: editNotes.trim(), imageUrl: editImageUrl });
    setSaving(false);
    setEditing(false);
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 md:bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-zinc-900 md:bottom-auto md:left-1/2 md:top-1/2 md:right-auto md:w-[440px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">

        {/* Handle mobile */}
        <div className="flex justify-center pt-3 pb-2 md:hidden">
          <div className="h-1 w-9 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        </div>

        {/* ── MODO VER ─────────────────────────────────────────────────── */}
        {!editing && (
          <>
            {item.imageUrl ? (
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 md:rounded-t-2xl" style={{ maxHeight: "55vh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={item.imageUrl} alt={item.name} className="w-full object-contain" style={{ maxHeight: "55vh" }} />
              </div>
            ) : (
              <PlaceholderHero color={color} />
            )}

            <div className="p-4 pb-8">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: color }}>
                  {initial}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Wishlist de {item.ownedByParticipant.name}</span>
              </div>

              <h2 className="mb-2 text-lg font-bold leading-tight text-zinc-900 dark:text-zinc-100">{item.name}</h2>

              {item.notes && (
                <p className="mb-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{item.notes}</p>
              )}

              {isOwner && (
                <div className="flex flex-col gap-2 mt-4">
                  <button
                    onClick={() => setEditing(true)}
                    className="w-full rounded-xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    ✏️ Editar item
                  </button>
                  <button
                    onClick={onToggleBought}
                    className={`w-full rounded-xl py-3 text-sm font-semibold transition-colors ${
                      item.bought
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                    }`}
                  >
                    {item.bought ? "✓ Marcado como comprado — desmarcar" : "✓ Marcar como comprado"}
                  </button>
                  <button
                    onClick={onDelete}
                    className="w-full rounded-xl bg-red-50 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    Eliminar de la wishlist
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── MODO EDITAR ──────────────────────────────────────────────── */}
        {editing && (
          <div className="p-4 pb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Editar item</h2>
              <button onClick={() => setEditing(false)} className="text-sm text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300">
                Cancelar
              </button>
            </div>

            {/* Foto */}
            {editImageUrl ? (
              <div className="relative mb-4 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800" style={{ maxHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={editImageUrl} alt="Preview" className="w-full object-contain" style={{ maxHeight: "40vh" }} />
                <button
                  type="button"
                  onClick={() => setEditImageUrl("")}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white text-sm hover:bg-black/80"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="mb-4">
                <UploadPhoto
                  subfolder={`${item.tripId}/wishlist`}
                  label="Subir foto del producto"
                  onUpload={(url) => setEditImageUrl(url)}
                />
              </div>
            )}

            {/* Nombre */}
            <div className="mb-3">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Nombre *
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={200}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500"
              />
            </div>

            {/* Notas */}
            <div className="mb-5">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Notas (opcional)
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!editName.trim() || saving}
              className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
