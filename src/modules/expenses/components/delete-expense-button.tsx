"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DeleteExpenseButton({
  tripId,
  expenseId,
}: {
  tripId: string;
  expenseId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function doDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/expenses/${expenseId}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        router.refresh();
        toast.success("Gasto eliminado");
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Error al eliminar el gasto");
      }
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function handleDelete() {
    toast("¿Eliminar este gasto?", {
      position: "top-center",
      action: { label: "Eliminar", onClick: doDelete },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="shrink-0 text-xs text-zinc-400 hover:text-red-500 disabled:opacity-50 transition-colors"
      aria-label="Eliminar gasto"
    >
      {loading ? "..." : "✕"}
    </button>
  );
}
