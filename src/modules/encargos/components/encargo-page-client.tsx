"use client";

import { useState } from "react";
import { EncargoForm } from "./encargo-form";
import { EncargoList } from "./encargo-list";
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

type Props = {
  token: string;
  friendName: string;
  trip: { id: string; name: string; destination: string | null };
  initialRequests: Request[];
};

export function EncargoPageClient({ token, friendName, trip, initialRequests }: Props) {
  const [requests, setRequests] = useState<Request[]>(initialRequests);

  function handleAdded(req: Omit<Request, "bought" | "cost">) {
    setRequests((prev) => [{ ...req, bought: false, cost: null }, ...prev]);
  }

  async function handleCancel(itemId: string) {
    await fetch(`/api/encargos/${token}/requests/${itemId}`, { method: "DELETE" });
    setRequests((prev) => prev.filter((r) => r.id !== itemId));
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-lg px-4 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-orange-400 to-red-500 text-3xl shadow-lg shadow-orange-900/30">
              🎁
            </span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-50">
            {trip.name}
          </h1>
          {trip.destination && (
            <p className="mt-1 text-sm text-zinc-400">📍 {trip.destination}</p>
          )}
          <p className="mt-3 text-sm text-zinc-400">
            Hola <span className="font-semibold text-zinc-200">{friendName}</span>, deja acá lo que quieres que busquemos.
          </p>
        </div>

        {/* Formulario */}
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
          <h2 className="mb-4 text-sm font-semibold text-zinc-300">Nuevo pedido</h2>
          <EncargoForm token={token} onAdded={handleAdded} />
        </div>

        {/* Lista de pedidos */}
        {requests.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-zinc-400">Tus pedidos ({requests.length})</h2>
            <EncargoList requests={requests} onCancel={handleCancel} />
          </div>
        )}
      </div>
    </div>
  );
}
