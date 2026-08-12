"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { WishlistFriendLink } from "../types";

type Props = {
  tripId: string;
  initialLinks: WishlistFriendLink[];
};

export function FriendLinksPanel({ tripId, initialLinks }: Props) {
  const [links, setLinks] = useState<WishlistFriendLink[]>(initialLinks);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);

  function update(updated: WishlistFriendLink[]) {
    setLinks(updated);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/wishlist/friend-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendName: newName.trim() }),
      });
      if (!res.ok) throw new Error();
      const link: WishlistFriendLink = await res.json();
      update([link, ...links]);
      setNewName("");
      setShowForm(false);
      toast.success(`Link para ${link.friendName} creado`);
    } catch {
      toast.error("Error al crear el link");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(linkId: string, friendName: string) {
    toast(`¿Deshabilitar link de ${friendName}?`, {
      description: "El amigo ya no podrá mandar pedidos. Sus encargos existentes se conservan.",
      action: {
        label: "Deshabilitar",
        onClick: async () => {
          const res = await fetch(`/api/trips/${tripId}/wishlist/friend-links/${linkId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            const { deleted } = await res.json() as { deleted: boolean };
            if (deleted) {
              // Sin productos — eliminar de la lista
              update(links.filter((l) => l.id !== linkId));
              toast.success("Link eliminado");
            } else {
              // Con productos — mostrar como deshabilitado
              update(links.map((l) => l.id === linkId ? { ...l, revokedAt: new Date().toISOString() } : l));
              toast.success("Link deshabilitado");
            }
          }
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  }

  async function handleRegenerate(linkId: string, friendName: string) {
    toast(`¿Regenerar link de ${friendName}?`, {
      description: "El link anterior dejará de funcionar",
      action: {
        label: "Regenerar",
        onClick: async () => {
          const res = await fetch(`/api/trips/${tripId}/wishlist/friend-links/${linkId}`, {
            method: "PATCH",
          });
          if (res.ok) {
            const { token } = await res.json();
            update(links.map((l) => l.id === linkId ? { ...l, token, revokedAt: null } : l));
            toast.success("Link regenerado");
          }
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/encargos/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  const active = links.filter((l) => !l.revokedAt);
  const revoked = links.filter((l) => l.revokedAt);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Links de amigos</h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Crear link
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del amigo (ej: Nico)"
            autoFocus
            className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {creating ? "..." : "Crear"}
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-3 py-2 text-sm text-zinc-500">
            Cancelar
          </button>
        </form>
      )}

      {active.length === 0 && !showForm && (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          Crea un link para que tus amigos puedan pedir encargos.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {active.map((link) => (
          <div key={link.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
              {link.friendName[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{link.friendName}</p>
              {link.pendingCount > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">{link.pendingCount} pedido{link.pendingCount > 1 ? "s" : ""} pendiente{link.pendingCount > 1 ? "s" : ""}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => copyLink(link.token)}
                title="Copiar link"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition-colors dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
              <button
                onClick={() => handleRegenerate(link.id, link.friendName)}
                title="Regenerar link"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition-colors dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </button>
              <button
                onClick={() => handleRevoke(link.id, link.friendName)}
                title="Revocar link"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        ))}

        {revoked.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              {revoked.length} link{revoked.length > 1 ? "s" : ""} revocado{revoked.length > 1 ? "s" : ""}
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              {revoked.map((link) => (
                <div key={link.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 opacity-50 dark:border-zinc-700 dark:bg-zinc-800/30">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-500 dark:bg-zinc-700">
                    {link.friendName[0].toUpperCase()}
                  </div>
                  <p className="text-sm text-zinc-500 line-through">{link.friendName}</p>
                  <button
                    onClick={() => handleRegenerate(link.id, link.friendName)}
                    className="ml-auto text-xs text-zinc-400 hover:text-zinc-600 underline"
                  >
                    Reactivar
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
