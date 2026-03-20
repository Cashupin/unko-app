"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DeleteItemButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function doDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        router.refresh();
        toast.success("Propuesta eliminada");
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Error al eliminar la propuesta");
      }
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function handleDelete() {
    toast("¿Eliminar esta propuesta?", {
      position: "top-center",
      action: { label: "Eliminar", onClick: doDelete },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="rounded-full px-2 py-0.5 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 transition-colors"
      aria-label="Eliminar ítem"
    >
      {loading ? "..." : "Eliminar"}
    </button>
  );
}
