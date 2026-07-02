"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";

function toDateInput(date: Date | null | undefined): string {
  if (!date) return "";
  return date instanceof Date
    ? date.toISOString().slice(0, 10)
    : String(date).slice(0, 10);
}

export function AddToItineraryButton({
  tripId,
  itemId,
  title,
  description,
  tripStartDate,
  tripEndDate,
  inItinerary = false,
  isAdmin = false,
}: {
  tripId: string;
  itemId: string;
  title: string;
  description?: string | null;
  tripStartDate?: Date | null;
  tripEndDate?: Date | null;
  inItinerary?: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [includeDescription, setIncludeDescription] = useState(true);
  const [isDraft, setIsDraft] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(inItinerary);

  useEffect(() => {
    setDone(inItinerary);
  }, [inItinerary]);

  const minDate = toDateInput(tripStartDate);
  const maxDate = toDateInput(tripEndDate);

  async function handleSubmit() {
    setLoading(true);
    try {
      const body: Record<string, string | boolean> = { title, itemId };
      if (date) body.activityDate = new Date(date).toISOString();
      if (time) body.activityTime = time;
      if (includeDescription && description) body.description = description;
      if (isDraft) body.isDraft = true;

      const res = await fetch(`/api/trips/${tripId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setDone(true);
        setOpen(false);
        router.refresh();
        toast.success("Agregado al itinerario");
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Error al agregar al itinerario");
      }
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <a
        href={`/trips/${tripId}?tab=itinerario`}
        className="text-xs text-green-600 font-medium hover:underline dark:text-green-400"
      >
        ✓ Ver en Itinerario →
      </a>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        + Itinerario
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Agregar al itinerario
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {title}
            </p>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Fecha (opcional)
                </label>
                <DatePicker
                  value={date}
                  onChange={setDate}
                  min={minDate || undefined}
                  max={maxDate || undefined}
                  initialMonth={minDate || undefined}
                  placeholder="Seleccionar fecha"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Hora (opcional)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:ring-zinc-500"
                />
              </div>

              {description && (
                <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-zinc-100 px-3 py-2.5 dark:border-zinc-700">
                  <input
                    type="checkbox"
                    checked={includeDescription}
                    onChange={(e) => setIncludeDescription(e.target.checked)}
                    className="rounded accent-zinc-700 dark:accent-zinc-300"
                  />
                  <div>
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Incluir descripción
                    </span>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                      {description}
                    </p>
                  </div>
                </label>
              )}

              {isAdmin && (
                <div className="rounded-xl border border-dashed border-indigo-500/30 bg-indigo-950/10 px-3 py-2.5">
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isDraft}
                      onChange={(e) => setIsDraft(e.target.checked)}
                      className="rounded accent-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-medium text-indigo-300">
                        Agregar como borrador
                      </span>
                      <p className="mt-0.5 text-[10px] text-indigo-400/60">
                        Solo tú la verás hasta que la confirmes
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {loading ? "Agregando..." : "Agregar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
