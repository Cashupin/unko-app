"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";

export function CreateExcursionForm({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  function reset() {
    setTitle(""); setDescription(""); setDate("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/excursions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          date: date || null,
        }),
      });
      if (!res.ok) { toast.error("Error al crear la excursión"); return; }
      toast.success("Excursión creada");
      reset();
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-[#3f3f46] dark:bg-[#27272a] dark:text-zinc-100 dark:placeholder-zinc-600 dark:focus:ring-zinc-600";
  const labelCls = "text-xs font-medium text-zinc-600 dark:text-zinc-400";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        + Añadir excursión
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 dark:border dark:border-[#27272a]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-[#27272a]">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Nueva excursión</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Puedes asignar la fecha más adelante</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Destino / nombre <span className="text-red-500">*</span></label>
                <input
                  autoFocus
                  type="text"
                  placeholder="ej. Kamakura, Monte Fuji, Nara…"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Notas</label>
                <textarea
                  rows={2}
                  placeholder="Qué planeas hacer ese día…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Fecha (opcional — se puede asignar después)</label>
                <DatePicker value={date} onChange={setDate} placeholder="Sin fecha aún" />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} disabled={loading}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-[#3f3f46] dark:text-zinc-400 dark:hover:bg-white/5">
                  Cancelar
                </button>
                <button type="submit" disabled={loading || !title.trim()}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                  {loading ? "Creando…" : "Crear excursión"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
