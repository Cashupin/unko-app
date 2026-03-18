"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreateItemFromActivityButton({
  tripId,
  activity,
}: {
  tripId: string;
  activity: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    locationLat: number | null;
    locationLng: number | null;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"PLACE" | "FOOD">("PLACE");
  const [open, setOpen] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      // 1. Create item
      const itemRes = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activity.title,
          type,
          tripId,
          description: activity.description ?? undefined,
          location: activity.location ?? undefined,
          locationLat: activity.locationLat ?? undefined,
          locationLng: activity.locationLng ?? undefined,
        }),
      });

      const itemData = (await itemRes.json()) as { id?: string; error?: string };
      if (!itemRes.ok) {
        toast.error(itemData.error ?? "Error al crear la propuesta");
        return;
      }

      // 2. Link item to activity
      const patchRes = await fetch(`/api/trips/${tripId}/activities/${activity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: itemData.id }),
      });

      if (!patchRes.ok) {
        toast.error("Propuesta creada pero no se pudo enlazar a la actividad");
        return;
      }

      toast.success("Propuesta creada y enlazada a la actividad");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (open) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <div className="flex rounded-lg border border-[#3f3f46] overflow-hidden text-[10px]">
          <button
            type="button"
            onClick={() => setType("PLACE")}
            className={`px-2.5 py-1 font-medium transition-colors ${
              type === "PLACE"
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            🏛️ Lugar
          </button>
          <button
            type="button"
            onClick={() => setType("FOOD")}
            className={`px-2.5 py-1 font-medium transition-colors border-l border-[#3f3f46] ${
              type === "FOOD"
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            🍜 Comida
          </button>
        </div>
        <button
          onClick={handleCreate}
          disabled={loading}
          className="rounded-lg bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {loading ? "..." : "Crear"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="mt-1.5 text-[10.5px] font-medium text-zinc-600 hover:text-zinc-300 transition-colors"
    >
      + Crear propuesta
    </button>
  );
}
