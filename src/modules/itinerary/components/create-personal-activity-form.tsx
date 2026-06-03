"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UploadPhoto } from "@/components/ui/upload-photo";
import { LocationInput } from "@/components/ui/location-input";
import { toast } from "sonner";

export function CreatePersonalActivityForm({
  tripId,
  date,
  tripStartDate,
}: {
  tripId: string;
  date: string;
  tripStartDate?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  void tripStartDate;

  function openModal() {
    setPhotoUrl(null);
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

    const body: Record<string, string | null | undefined> = {
      date,
      title: (fd.get("title") as string).trim(),
    };

    const description = (fd.get("description") as string).trim();
    const location = (fd.get("location") as string).trim();
    const time = fd.get("activityTime") as string;
    const notes = (fd.get("notes") as string).trim();

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

      closeModal();
      router.refresh();
      toast.success("Añadido a tu plan");
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="flex items-center gap-1.5 rounded-lg border border-violet-700/40 bg-violet-900/20 px-2.5 py-1.5 text-xs font-semibold text-violet-400 transition-colors hover:bg-violet-900/40"
      >
        🔒 + Añadir a mi plan
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-[#0f1419] p-6 shadow-2xl ring-1 ring-violet-700/30 max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-violet-100">🔒 Mi plan</h2>
                <p className="mt-0.5 text-xs text-violet-400/70">Solo visible para ti</p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-violet-500 transition-colors hover:bg-violet-900/40 hover:text-violet-300"
                aria-label="Cerrar"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Title */}
              <div className="flex flex-col gap-1">
                <label htmlFor="pa-title" className="text-xs font-medium text-violet-300">
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
                  className="rounded-lg border border-violet-700/40 bg-[#18191c] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label htmlFor="pa-description" className="text-xs font-medium text-violet-300">
                  Descripción
                </label>
                <textarea
                  id="pa-description"
                  name="description"
                  rows={2}
                  maxLength={1000}
                  placeholder="Descripción breve (opcional)"
                  className="resize-none rounded-lg border border-violet-700/40 bg-[#18191c] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500"
                />
              </div>

              {/* Location */}
              <div className="flex flex-col gap-1">
                <label htmlFor="pa-location" className="text-xs font-medium text-violet-300">
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

              {/* Time */}
              <div className="flex flex-col gap-1">
                <label htmlFor="pa-time" className="text-xs font-medium text-violet-300">
                  Hora
                </label>
                <input
                  id="pa-time"
                  name="activityTime"
                  type="time"
                  className="rounded-lg border border-violet-700/40 bg-[#18191c] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500"
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label htmlFor="pa-notes" className="text-xs font-medium text-violet-300">
                  Notas
                </label>
                <textarea
                  id="pa-notes"
                  name="notes"
                  rows={2}
                  maxLength={1000}
                  placeholder="Notas adicionales (opcional)"
                  className="resize-none rounded-lg border border-violet-700/40 bg-[#18191c] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500"
                />
              </div>

              {/* Photo */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-violet-300">Foto</p>
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

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="rounded-lg border border-[#27272a] px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-[#27272a] disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
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
