"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DeleteTripButton({
  tripId,
  tripName,
  variant = "menu",
}: {
  tripId: string;
  tripName: string;
  /** "header" = bordered compact button; "menu" = full-width menu item; "icon" = compact icon tile */
  variant?: "header" | "menu" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Error al eliminar el viaje");
        return;
      }
      toast.success("Viaje eliminado");
      router.push("/");
    } catch {
      toast.error("Error al eliminar el viaje");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          variant === "header"
            ? "rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors dark:border-zinc-700 dark:text-red-400 dark:hover:bg-red-950/40"
            : variant === "icon"
            ? "flex w-full flex-col items-center gap-1.5 rounded-2xl bg-red-50 py-3.5 transition-colors hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50"
            : "w-full rounded-lg px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
        }
      >
        {variant === "icon" ? (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 dark:text-red-400">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/>
              <path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">Eliminar</span>
          </>
        ) : "Eliminar viaje"}
      </button>

      {open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              ¿Eliminar viaje?
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Se eliminará <span className="font-medium text-zinc-700 dark:text-zinc-300">{tripName}</span> junto con todas sus actividades, gastos, fotos e información. Esta acción es irreversible.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {loading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
