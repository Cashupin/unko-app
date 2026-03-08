"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadPhoto } from "@/components/upload-photo";
import { LocationInput } from "@/components/location-input";
import { toast } from "sonner";

type ItemData = {
  id: string;
  title: string;
  type: "PLACE" | "FOOD";
  description: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  address: string | null;
  externalUrl: string | null;
  imageUrl: string | null;
};

export function EditItemForm({ item }: { item: ItemData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(item.imageUrl);

  function closeModal() {
    setOpen(false);
    setImageUrl(item.imageUrl);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);

    const body: Record<string, string | number | null | undefined> = {
      title: (fd.get("title") as string).trim(),
      type: fd.get("type") as string,
    };

    const description = (fd.get("description") as string).trim();
    const location = (fd.get("location") as string).trim();
    const latRaw = (fd.get("locationLat") as string).trim();
    const lngRaw = (fd.get("locationLng") as string).trim();
    const locationLat = latRaw ? parseFloat(latRaw) : null;
    const locationLng = lngRaw ? parseFloat(lngRaw) : null;
    const address = (fd.get("address") as string | null)?.trim() || null;
    const rawUrl = (fd.get("externalUrl") as string).trim();
    const externalUrl = rawUrl && !/^https?:\/\//i.test(rawUrl) ? `https://${rawUrl}` : rawUrl || null;

    body.description = description || null;
    body.location = location || null;
    body.locationLat = locationLat;
    body.locationLng = locationLng;
    body.address = address;
    body.externalUrl = externalUrl;
    body.imageUrl = imageUrl;

    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Error al editar el ítem");
        return;
      }

      closeModal();
      router.refresh();
      toast.success("Ítem actualizado");
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Trigger — pencil icon */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        aria-label="Editar ítem"
        title="Editar"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.5 2.5a2.121 2.121 0 0 1 3 3L5 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto dark:bg-zinc-800">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Editar ítem
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
              {/* Title */}
              <div className="flex flex-col gap-1">
                <label htmlFor="edit-title" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-title"
                  name="title"
                  required
                  maxLength={255}
                  defaultValue={item.title}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                />
              </div>

              {/* Type */}
              <div className="flex flex-col gap-1">
                <label htmlFor="edit-type" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <select
                  id="edit-type"
                  name="type"
                  required
                  defaultValue={item.type}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:ring-zinc-500"
                >
                  <option value="PLACE">Lugar</option>
                  <option value="FOOD">Comida</option>
                </select>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label htmlFor="edit-description" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Descripción
                </label>
                <textarea
                  id="edit-description"
                  name="description"
                  rows={3}
                  maxLength={1000}
                  defaultValue={item.description ?? ""}
                  placeholder="Descripción breve (opcional)"
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                />
              </div>

              {/* Location */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Ubicación
                </label>
                <LocationInput
                  id="edit-location"
                  name="location"
                  nameLat="locationLat"
                  nameLng="locationLng"
                  nameAddress="address"
                  defaultValue={item.location ?? ""}
                  defaultLat={item.locationLat}
                  defaultLng={item.locationLng}
                  defaultAddress={item.address}
                  placeholder="Ej: Cartagena, Colombia (opcional)"
                />
              </div>

              {/* External URL */}
              <div className="flex flex-col gap-1">
                <label htmlFor="edit-externalUrl" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Enlace externo
                </label>
                <input
                  id="edit-externalUrl"
                  name="externalUrl"
                  type="text"
                  defaultValue={item.externalUrl ?? ""}
                  placeholder="https://... o www.ejemplo.com (opcional)"
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                />
              </div>

              {/* Image */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Imagen del ítem (opcional)
                </span>
                {imageUrl && (
                  <div className="relative w-full h-36 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                    <Image src={imageUrl} alt="Vista previa" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="absolute top-1.5 right-1.5 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white hover:bg-black/70"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
                <UploadPhoto
                  label={imageUrl ? "Cambiar imagen" : "Subir imagen"}
                  onUpload={(url) => setImageUrl(url)}
                  disabled={loading}
                />
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
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
