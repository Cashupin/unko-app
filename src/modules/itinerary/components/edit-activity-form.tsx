"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UploadPhoto } from "@/components/ui/upload-photo";
import { DatePicker } from "@/components/ui/date-picker";
import { LocationInput } from "@/components/ui/location-input";
import { toast } from "sonner";

type ActivityData = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  activityDate: string | null; // "YYYY-MM-DD" or null
  activityTime: string | null;
  notes: string | null;
  photoUrl: string | null;
};

export function EditActivityForm({
  tripId,
  activity,
}: {
  tripId: string;
  activity: ActivityData;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(activity.photoUrl);

  function openModal() {
    setPhotoUrl(activity.photoUrl);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);

    const latRaw = (fd.get("locationLat") as string).trim();
    const lngRaw = (fd.get("locationLng") as string).trim();

    const body: Record<string, string | number | null | undefined> = {
      title: (fd.get("title") as string).trim(),
      description: (fd.get("description") as string).trim() || null,
      location: (fd.get("location") as string).trim() || null,
      locationLat: latRaw ? parseFloat(latRaw) : null,
      locationLng: lngRaw ? parseFloat(lngRaw) : null,
      activityDate: (fd.get("activityDate") as string) || null,
      activityTime: (fd.get("activityTime") as string) || null,
      notes: (fd.get("notes") as string).trim() || null,
      photoUrl: photoUrl,
    };

    try {
      const res = await fetch(
        `/api/trips/${tripId}/activities/${activity.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Error al actualizar la actividad");
        return;
      }

      closeModal();
      router.refresh();
      toast.success("Actividad actualizada");
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="rounded-md px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        aria-label="Editar actividad"
        title="Editar"
      >
        ✏️
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto dark:bg-zinc-800">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Editar actividad
              </h2>
              <button
                onClick={closeModal}
                className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="ea-title"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  id="ea-title"
                  name="title"
                  type="text"
                  required
                  maxLength={200}
                  defaultValue={activity.title}
                  placeholder="Ej: Visita al Templo Sensoji"
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="ea-description"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Descripción
                </label>
                <textarea
                  id="ea-description"
                  name="description"
                  rows={2}
                  defaultValue={activity.description ?? ""}
                  placeholder="Descripción breve (opcional)"
                  className="resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="ea-location"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Ubicación
                </label>
                <LocationInput
                  id="ea-location"
                  name="location"
                  nameLat="locationLat"
                  nameLng="locationLng"
                  defaultValue={activity.location ?? ""}
                  defaultLat={activity.locationLat}
                  defaultLng={activity.locationLng}
                  placeholder="Ej: Asakusa, Tokyo"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="ea-date"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Fecha
                </label>
                <DatePicker
                  id="ea-date"
                  name="activityDate"
                  defaultValue={activity.activityDate ?? ""}
                  placeholder="Seleccionar fecha"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="ea-time"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Hora
                </label>
                <input
                  id="ea-time"
                  name="activityTime"
                  type="time"
                  defaultValue={activity.activityTime ?? ""}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:ring-zinc-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="ea-notes"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Notas
                </label>
                <textarea
                  id="ea-notes"
                  name="notes"
                  rows={2}
                  defaultValue={activity.notes ?? ""}
                  placeholder="Notas adicionales (opcional)"
                  className="resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                />
              </div>

              {/* Photo */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Foto</p>
                {photoUrl ? (
                  <div className="relative">
                    <div className="relative h-36 w-full overflow-hidden rounded-xl">
                      <Image
                        src={photoUrl}
                        alt="Foto de actividad"
                        fill
                        className="object-cover"
                      />
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
                    subfolder={`${tripId}/itinerary`}
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
