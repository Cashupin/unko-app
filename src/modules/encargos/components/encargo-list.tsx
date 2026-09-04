"use client";

import { toast } from "sonner";
import Image from "next/image";
import type { WishlistRequestStatus } from "@/modules/wishlist/types";

type Request = {
  id: string;
  name: string;
  notes: string | null;
  imageUrl: string | null;
  requestStatus: WishlistRequestStatus;
  bought: boolean;
  cost: number | null;
  createdAt: string;
};

const STATUS_LABEL: Record<WishlistRequestStatus, { label: string; className: string }> = {
  PENDING:  { label: "En revisión",  className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  APPROVED: { label: "Aceptado ✓",   className: "bg-green-500/15 text-green-400 border-green-500/30" },
  REJECTED: { label: "Rechazado",    className: "bg-zinc-700 text-zinc-400 border-zinc-700" },
};

type Props = {
  requests: Request[];
  onCancel: (id: string) => void;
};

export function EncargoList({ requests, onCancel }: Props) {
  async function handleCancel(id: string) {
    toast("¿Cancelar este pedido?", {
      action: {
        label: "Sí, cancelar",
        onClick: () => onCancel(id),
      },
      cancel: { label: "No", onClick: () => {} },
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      {requests.map((req) => {
        const isRejected = req.requestStatus === "REJECTED";
        const isBought = req.requestStatus === "APPROVED" && req.bought;
        const status = isBought
          ? { label: "Comprado 🎉", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" }
          : STATUS_LABEL[req.requestStatus];
        const canCancel = (req.requestStatus === "PENDING" || req.requestStatus === "APPROVED") && !req.bought;

        return (
          <div
            key={req.id}
            className={`flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition-opacity ${isRejected || isBought ? "opacity-60" : ""}`}
          >
            {req.imageUrl && (
              <Image src={req.imageUrl} alt={req.name} width={56} height={56} className="shrink-0 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug text-zinc-100">{req.name}</p>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                  {isBought && req.cost != null && (
                    <span className="text-xs font-semibold text-emerald-400">
                      {req.cost.toLocaleString("es-CL")}
                    </span>
                  )}
                </div>
              </div>
              {req.notes && (
                <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{req.notes}</p>
              )}
              {canCancel && (
                <button
                  onClick={() => handleCancel(req.id)}
                  className="mt-1.5 text-xs text-zinc-600 underline transition-colors hover:text-zinc-400"
                >
                  Cancelar pedido
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
