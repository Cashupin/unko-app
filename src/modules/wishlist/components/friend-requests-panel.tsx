"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { FriendRequest } from "../types";

type Props = {
  tripId: string;
  initialRequests: FriendRequest[];
  onRequestUpdate: (id: string, changes: Partial<FriendRequest>) => void;
};

export function FriendRequestsPanel({ tripId, initialRequests, onRequestUpdate }: Props) {
  const [requests, setRequests] = useState<FriendRequest[]>(initialRequests);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Sync cuando el padre actualiza la lista (ej: nuevo pedido llega por broadcast)
  // initialRequests viene de la prop controlada por EncargosSubtabClient
  // Se usa para mantener la lista de pendientes actualizada
  function remove(id: string) {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleApprove(req: FriendRequest) {
    const res = await fetch(`/api/trips/${tripId}/wishlist/${req.id}/approve`, { method: "POST" });
    if (res.ok) {
      remove(req.id);
      onRequestUpdate(req.id, { requestStatus: "APPROVED" });
      toast.success("Encargo aprobado");
    } else {
      toast.error("Error al aprobar");
    }
  }

  async function handleReject(req: FriendRequest) {
    toast("¿Rechazar este encargo?", {
      action: {
        label: "Rechazar",
        onClick: async () => {
          const res = await fetch(`/api/trips/${tripId}/wishlist/${req.id}/reject`, { method: "POST" });
          if (res.ok) {
            remove(req.id);
            onRequestUpdate(req.id, { requestStatus: "REJECTED" });
          } else {
            toast.error("Error al rechazar");
          }
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  }

  if (requests.length === 0) {
    return (
      <p className="text-sm text-zinc-400 dark:text-zinc-500">No hay pedidos pendientes.</p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800"
          >
            {req.imageUrl && (
              <button
                type="button"
                onClick={() => setZoomedImage(req.imageUrl!)}
                className="shrink-0 overflow-hidden rounded-lg"
                title="Ver imagen"
              >
                <img
                  src={req.imageUrl}
                  alt={req.name}
                  className="h-14 w-14 object-cover transition-opacity hover:opacity-80"
                />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">de {req.friendName}</p>
              <p className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100">{req.name}</p>
              {req.notes && (
                <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{req.notes}</p>
              )}
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={() => handleApprove(req)}
                  className="flex-1 rounded-lg bg-zinc-900 py-1.5 text-xs font-medium text-white hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => handleReject(req)}
                  className="flex-1 rounded-lg border border-zinc-200 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt="Vista ampliada"
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
