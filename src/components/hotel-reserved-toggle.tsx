"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function HotelReservedToggle({
  tripId,
  hotelId,
  reserved,
}: {
  tripId: string;
  hotelId: string;
  reserved: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/hotels/${hotelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reserved: !reserved }),
      });
      if (!res.ok) {
        toast.error("Error al actualizar");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        reserved
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60"
          : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600"
      }`}
      title={reserved ? "Marcar como no reservado" : "Marcar como reservado"}
    >
      <span>{reserved ? "✓" : "○"}</span>
      {reserved ? "Reservado" : "Sin reservar"}
    </button>
  );
}
