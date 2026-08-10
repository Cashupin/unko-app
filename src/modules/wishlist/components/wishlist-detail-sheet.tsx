"use client";

import { useEffect, useState } from "react";
import { UploadPhoto } from "@/components/ui/upload-photo";
import { useSheetHistory } from "@/lib/use-sheet-history";
import { participantColor, participantInitial } from "./wishlist-client";
import type { WishlistGroup, WishlistItem, WishlistParticipant } from "../types";

function PlaceholderHero({ color }: { color: string }) {
  return (
    <div className="flex w-full items-center justify-center"
      style={{ aspectRatio: "16/9", background: `linear-gradient(135deg, ${color}22, ${color}44)` }}>
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 opacity-60">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    </div>
  );
}

type Props = {
  group: WishlistGroup;
  participants: WishlistParticipant[];
  myParticipantId: string;
  canEdit: boolean;
  onClose: () => void;
  onToggleBought: (item: WishlistItem) => void;
  onUpdate: (item: WishlistItem, data: { name: string; notes: string; imageUrl: string }) => Promise<void>;
  onDelete: (item: WishlistItem) => void;
  onWant: () => void;
  onUnwant: (myItem: WishlistItem) => void;
};

export function WishlistDetailSheet({ group, participants, myParticipantId, canEdit, onClose, onToggleBought, onUpdate, onDelete, onWant, onUnwant }: Props) {
  const { root } = group;
  const color = participantColor(root.ownedByParticipantId, participants);

  // ¿El usuario actual tiene un item en este grupo?
  const myItem = group.all.find((i) => i.ownedByParticipantId === myParticipantId) ?? null;
  const amIOwner = myItem?.id === root.id;
  const amIMember = myItem !== null;

  useSheetHistory(onClose);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(root.name);
  const [editNotes, setEditNotes] = useState(root.notes ?? "");
  const [editImageUrl, setEditImageUrl] = useState(root.imageUrl ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditing(false);
    setEditName(root.name);
    setEditNotes(root.notes ?? "");
    setEditImageUrl(root.imageUrl ?? "");
  }, [root.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { if (editing) setEditing(false); else onClose(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, editing]);

  async function handleSave() {
    if (!editName.trim() || !myItem) return;
    setSaving(true);
    await onUpdate(root, { name: editName.trim(), notes: editNotes.trim(), imageUrl: editImageUrl });
    setSaving(false);
    setEditing(false);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 md:bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-zinc-900 md:bottom-auto md:left-1/2 md:top-1/2 md:right-auto md:w-110 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">

        {/* Handle mobile */}
        <div className="flex justify-center pt-2 pb-1 md:hidden">
          <button onClick={onClose} className="flex items-center justify-center p-1 text-zinc-300 dark:text-zinc-600" aria-label="Cerrar">
            <svg width="56" height="24" viewBox="0 0 56 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8l24 12 24-12" />
            </svg>
          </button>
        </div>

        {/* ── MODO VER ─────────────────────────────────────────────────────── */}
        {!editing && (
          <>
            {root.imageUrl ? (
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 md:rounded-t-2xl"
                style={{ maxHeight: "55vh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={root.imageUrl} alt={root.name} className="w-full object-contain" style={{ maxHeight: "55vh" }} />
              </div>
            ) : (
              <PlaceholderHero color={color} />
            )}

            <div className="p-4 pb-8">
              <h2 className="mb-1 text-lg font-bold leading-tight text-zinc-900 dark:text-zinc-100">{root.name}</h2>

              {root.notes && (
                <p className="mb-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{root.notes}</p>
              )}

              {/* ── Quiénes lo quieren ── */}
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  {group.all.length === 1 ? "Lo quiere" : "Lo quieren"}
                </p>
                <div className="flex flex-col gap-1.5">
                  {group.all.map((item) => {
                    const c = participantColor(item.ownedByParticipantId, participants);
                    const init = participantInitial(item.ownedByParticipant.name);
                    const isMe = item.ownedByParticipantId === myParticipantId;
                    return (
                      <div key={item.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2 bg-zinc-50 dark:bg-zinc-800">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: c }}>
                          {init}
                        </span>
                        <span className="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          {item.ownedByParticipant.name}{isMe && " (tú)"}
                        </span>
                        <span className={`text-xs font-semibold ${item.bought ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500"}`}>
                          {item.bought ? "✓ Comprado" : "Pendiente"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Acciones ── */}
              {canEdit && (
                <div className="flex flex-col gap-2">

                  {/* Si soy miembro: toggle bought de mi item */}
                  {amIMember && myItem && (
                    <button onClick={() => onToggleBought(myItem)}
                      className={`w-full rounded-xl py-3 text-sm font-semibold transition-colors ${
                        myItem.bought
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                      }`}>
                      {myItem.bought ? "✓ Marcado como comprado — desmarcar" : "✓ Marcar como comprado"}
                    </button>
                  )}

                  {/* Si soy owner (root): editar y eliminar */}
                  {amIOwner && (
                    <>
                      <button onClick={() => setEditing(true)}
                        className="w-full rounded-xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                        ✏️ Editar item
                      </button>
                      <button onClick={() => onDelete(root)}
                        className="w-full rounded-xl bg-red-50 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30">
                        Eliminar de la wishlist
                      </button>
                    </>
                  )}

                  {/* Si soy miembro pero NO el owner: "Ya no lo quiero" */}
                  {amIMember && !amIOwner && myItem && (
                    <button onClick={() => onUnwant(myItem)}
                      className="w-full rounded-xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-500 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
                      Ya no lo quiero
                    </button>
                  )}

                  {/* Si NO soy miembro: "Yo también lo quiero" */}
                  {!amIMember && (
                    <button onClick={onWant}
                      className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
                      🎁 Yo también lo quiero
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── MODO EDITAR ──────────────────────────────────────────────────── */}
        {editing && (
          <div className="p-4 pb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Editar item</h2>
              <button onClick={() => setEditing(false)} className="text-sm text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300">
                Cancelar
              </button>
            </div>

            {editImageUrl ? (
              <div className="relative mb-4 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800"
                style={{ maxHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={editImageUrl} alt="Preview" className="w-full object-contain" style={{ maxHeight: "40vh" }} />
                <button type="button" onClick={() => setEditImageUrl("")}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white text-sm hover:bg-black/80">
                  ✕
                </button>
              </div>
            ) : (
              <div className="mb-4">
                <UploadPhoto subfolder={`${root.tripId}/wishlist`} label="Subir foto del producto" onUpload={(url) => setEditImageUrl(url)} />
              </div>
            )}

            <div className="mb-3">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Nombre *</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={200}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500" />
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Notas (opcional)</label>
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} maxLength={1000}
                className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500" />
            </div>

            <button onClick={handleSave} disabled={!editName.trim() || saving}
              className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
