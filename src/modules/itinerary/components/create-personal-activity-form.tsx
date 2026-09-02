"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UploadPhoto } from "@/components/ui/upload-photo";
import { LocationInput } from "@/components/ui/location-input";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";

export function CreatePersonalActivityForm({
  tripId,
  date,
  tripStartDate,
  tripEndDate,
  compact = true,
}: {
  tripId: string;
  date: string | null;
  tripStartDate?: string;
  tripEndDate?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(date ?? "");
  const [createProposal, setCreateProposal] = useState(false);
  const [proposalType, setProposalType] = useState<"PLACE" | "FOOD" | "ACTIVITY">("PLACE");

  function openModal() {
    setPhotoUrl(null);
    setSelectedDate(date ?? "");
    setCreateProposal(false);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setPhotoUrl(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const title = (fd.get("title") as string).trim();
    const description = (fd.get("description") as string).trim();
    const location = (fd.get("location") as string).trim();
    const time = fd.get("activityTime") as string;
    const notes = (fd.get("notes") as string).trim();

    const body: Record<string, string | null | undefined> = {
      title,
      date: selectedDate || null,
    };
    if (description) body.description = description;
    if (location) body.location = location;
    if (time) body.time = time;
    if (notes) body.notes = notes;
    if (photoUrl) body.photoUrl = photoUrl;

    try {
      const res = await fetch(`/api/trips/${tripId}/personal-activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Error al guardar");
        return;
      }

      const created = (await res.json()) as { id: string };

      // Si el checkbox de propuesta está activo, crear Item y linkar
      if (createProposal && created.id) {
        const itemBody: Record<string, unknown> = { title, type: proposalType, tripId };
        if (description) itemBody.description = description;
        if (location) itemBody.location = location;

        const itemRes = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemBody),
        });

        if (itemRes.ok) {
          const itemData = (await itemRes.json()) as { id?: string };
          if (itemData.id) {
            await fetch(`/api/trips/${tripId}/personal-activities/${created.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemId: itemData.id }),
            });
          }
        }
      }

      closeModal();
      router.refresh();
      toast.success(createProposal ? "Añadido a tu plan y creado como propuesta" : "Añadido a tu plan");
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500";

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={openModal}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-600 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        >
          <span className="text-sm font-light leading-none">+</span>
          Agregar actividad
        </button>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + Nueva actividad
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-6 shadow-2xl ring-1 ring-zinc-700 max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-100">Mi Plan</h2>
                <p className="mt-0.5 text-xs text-zinc-500">Solo visible para ti</p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                aria-label="Cerrar"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Título */}
              <div className="flex flex-col gap-1">
                <label htmlFor="pa-title" className="text-xs font-medium text-zinc-300">
                  Título <span className="text-red-400">*</span>
                </label>
                <input
                  id="pa-title"
                  name="title"
                  type="text"
                  required
                  minLength={1}
                  maxLength={200}
                  autoFocus
                  placeholder="Ej: Visitar el mercado de Nishiki"
                  className={inputCls}
                />
              </div>

              {/* Descripción */}
              <div className="flex flex-col gap-1">
                <label htmlFor="pa-description" className="text-xs font-medium text-zinc-300">
                  Descripción
                </label>
                <textarea
                  id="pa-description"
                  name="description"
                  rows={2}
                  maxLength={1000}
                  placeholder="Descripción breve (opcional)"
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Ubicación */}
              <div className="flex flex-col gap-1">
                <label htmlFor="pa-location" className="text-xs font-medium text-zinc-300">
                  Ubicación
                </label>
                <LocationInput
                  id="pa-location"
                  name="location"
                  nameLat="_lat"
                  nameLng="_lng"
                  placeholder="Ej: Mercado Nishiki, Kyoto"
                />
              </div>

              {/* Fecha | Hora en 2 columnas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="pa-date" className="text-xs font-medium text-zinc-300">
                    Fecha
                  </label>
                  <DatePicker
                    id="pa-date"
                    name="activityDate"
                    value={selectedDate}
                    onChange={setSelectedDate}
                    min={tripStartDate}
                    max={tripEndDate}
                    placeholder="Sin fecha (opcional)"
                    initialMonth={tripStartDate}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="pa-time" className="text-xs font-medium text-zinc-300">
                    Hora
                  </label>
                  <input
                    id="pa-time"
                    name="activityTime"
                    type="time"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Notas */}
              <div className="flex flex-col gap-1">
                <label htmlFor="pa-notes" className="text-xs font-medium text-zinc-300">
                  Notas
                </label>
                <textarea
                  id="pa-notes"
                  name="notes"
                  rows={2}
                  maxLength={1000}
                  placeholder="Notas adicionales (opcional)"
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Foto */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-zinc-300">Foto</p>
                {photoUrl ? (
                  <div className="relative">
                    <div className="relative h-36 w-full overflow-hidden rounded-xl">
                      <Image src={photoUrl} alt="Foto" fill className="object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setPhotoUrl(null)}
                      className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white hover:bg-black/80"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <UploadPhoto
                    onUpload={setPhotoUrl}
                    label="+ Subir foto"
                    disabled={loading}
                    subfolder={`${tripId}/personal`}
                  />
                )}
              </div>

              {/* Checkbox: crear también como propuesta grupal */}
              <div className="rounded-xl border border-zinc-800 px-3 py-2.5">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={createProposal}
                    onChange={(e) => setCreateProposal(e.target.checked)}
                    className="rounded accent-zinc-500"
                  />
                  <span className="text-xs font-medium text-zinc-400">
                    Crear también como propuesta del grupo
                  </span>
                </label>
                {createProposal && (
                  <div className="mt-2 flex gap-2 pl-6">
                    {(["PLACE", "FOOD", "ACTIVITY"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setProposalType(t)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          proposalType === t
                            ? "bg-zinc-100 text-zinc-900"
                            : "border border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                        }`}
                      >
                        {t === "PLACE" ? "📍 Lugar" : t === "FOOD" ? "🍜 Comida" : "🎯 Actividad"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
                >
                  {loading ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
