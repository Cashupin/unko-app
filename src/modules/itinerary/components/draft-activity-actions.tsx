"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DraftActivityActions({
  tripId,
  activityId,
}: {
  tripId: string;
  activityId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function approve() {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/activities/${activityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDraft: false }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        toast.error(d.error ?? "Error al confirmar actividad");
        return;
      }
      toast.success("Actividad confirmada");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function discard() {
    toast("¿Descartar esta actividad borrador?", {
      position: "top-center",
      action: {
        label: "Descartar",
        onClick: async () => {
          setLoading(true);
          try {
            const res = await fetch(`/api/trips/${tripId}/activities/${activityId}`, { method: "DELETE" });
            if (res.ok || res.status === 204) {
              toast.success("Actividad descartada");
              router.refresh();
            } else {
              const d = await res.json().catch(() => ({})) as { error?: string };
              toast.error(d.error ?? "Error al descartar actividad");
            }
          } finally {
            setLoading(false);
          }
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={approve}
        disabled={loading}
        className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
      >
        ✓ Confirmar
      </button>
      <button
        onClick={discard}
        disabled={loading}
        className="flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-500 hover:border-red-500/40 hover:text-red-400 transition-colors disabled:opacity-50"
      >
        ✕ Descartar
      </button>
    </div>
  );
}
