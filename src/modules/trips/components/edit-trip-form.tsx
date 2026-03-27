"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CURRENCY_OPTIONS } from "@/lib/constants";
import { DatePicker } from "@/components/ui/date-picker";
import { UploadPhoto } from "@/components/ui/upload-photo";
import { toast } from "sonner";

type TripData = {
  id: string;
  name: string;
  description: string | null;
  destination: string | null;
  startDate: string | Date | null;
  endDate: string | Date | null;
  defaultCurrency: string;
  coverImageUrl?: string | null;
};

function toDateInput(d: string | Date | null): string {
  if (!d) return "";
  const date = new Date(d);
  return date.toISOString().split("T")[0];
}

export function EditTripForm({
  trip,
  variant = "header",
}: {
  trip: TripData;
  /** "header" = bordered compact button; "menu" = full-width menu item */
  variant?: "header" | "menu";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(trip.coverImageUrl ?? null);

  function openModal() {
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);

    const body: Record<string, string | undefined> = {
      name: (fd.get("name") as string).trim(),
      defaultCurrency: fd.get("defaultCurrency") as string,
    };

    const description = (fd.get("description") as string).trim();
    const destination = (fd.get("destination") as string).trim();
    const startDate = fd.get("startDate") as string;
    const endDate = fd.get("endDate") as string;

    body.description = description;
    body.destination = destination;
    body.startDate = startDate;
    body.endDate = endDate;
    body.coverImageUrl = coverImageUrl ?? "";

    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Error al guardar los cambios");
        return;
      }

      closeModal();
      router.refresh();
      toast.success("Viaje actualizado");
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
        className={
          variant === "menu"
            ? "w-full rounded-lg px-4 py-2.5 text-left text-sm text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-700"
            : "rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
        }
      >
        Editar viaje
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 md:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full h-full md:h-auto max-w-md md:rounded-2xl bg-white p-6 shadow-2xl md:max-h-[90vh] overflow-y-auto dark:bg-zinc-800">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Editar viaje</h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300" aria-label="Cerrar">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="edit-name" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-name" name="name" type="text" required
                  maxLength={50}
                  defaultValue={trip.name}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:ring-zinc-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="edit-destination" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Destino</label>
                <input
                  id="edit-destination" name="destination" type="text"
                  defaultValue={trip.destination ?? ""}
                  placeholder="Ej: Tokyo, Osaka"
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="edit-startDate" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Inicio</label>
                <DatePicker
                  id="edit-startDate"
                  name="startDate"
                  defaultValue={toDateInput(trip.startDate)}
                  placeholder="Seleccionar fecha"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="edit-endDate" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Término</label>
                <DatePicker
                  id="edit-endDate"
                  name="endDate"
                  defaultValue={toDateInput(trip.endDate)}
                  placeholder="Seleccionar fecha"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="edit-currency" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Moneda principal</label>
                <select
                  id="edit-currency" name="defaultCurrency"
                  defaultValue={trip.defaultCurrency}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:ring-zinc-500"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="edit-description" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Descripción</label>
                <textarea
                  id="edit-description" name="description" rows={3}
                  defaultValue={trip.description ?? ""}
                  placeholder="Notas sobre el viaje (opcional)"
                  className="resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                />
              </div>

              {/* Cover photo */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Foto de portada <span className="text-zinc-400 font-normal">(opcional)</span>
                </label>
                {coverImageUrl ? (
                  <div className="relative rounded-xl overflow-hidden h-28">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverImageUrl} alt="Portada" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCoverImageUrl(null)}
                      className="absolute top-2 right-2 rounded-full bg-black/50 text-white text-xs px-2 py-1 hover:bg-black/70 transition-colors"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <UploadPhoto
                    onUpload={setCoverImageUrl}
                    label="Subir foto de portada"
                    subfolder={`${trip.id}/trip-covers`}
                    disabled={loading}
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button" onClick={closeModal} disabled={loading}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={loading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
