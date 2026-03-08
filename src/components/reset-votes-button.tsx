"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ResetVotesButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function doReset() {
    setLoading(true);
    try {
      const res = await fetch(`/api/items/${itemId}/reset-votes`, { method: "POST" });
      if (res.ok) {
        router.refresh();
        toast.success("Votación reiniciada");
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Error al reiniciar la votación");
      }
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    toast("¿Reiniciar la votación? Se borrarán todos los votos.", {
      position: "top-center",
      action: { label: "Reiniciar", onClick: doReset },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  }

  return (
    <button
      onClick={handleReset}
      disabled={loading}
      className="rounded-full px-2 py-0.5 text-xs text-zinc-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50 transition-colors dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
      aria-label="Reiniciar votación"
    >
      {loading ? "..." : "Reabrir votación"}
    </button>
  );
}
