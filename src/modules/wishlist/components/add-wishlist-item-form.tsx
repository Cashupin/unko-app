"use client";

import { useEffect, useState } from "react";
import { UploadPhoto } from "@/components/ui/upload-photo";

type Props = {
  tripId: string;
  onClose: () => void;
  onSave: (data: { name: string; notes: string; imageUrl: string }) => Promise<void>;
};

export function AddWishlistItemForm({ onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), notes: notes.trim(), imageUrl });
    setSaving(false);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:bg-black/40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-zinc-900 md:bottom-auto md:left-1/2 md:top-1/2 md:right-auto md:w-[440px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">

        {/* Handle — mobile only */}
        <div className="flex justify-center pt-3 pb-2 md:hidden">
          <div className="h-1 w-9 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        </div>

        <form onSubmit={handleSubmit} className="p-4 pb-10">
          <h2 className="mb-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
            Agregar a tu wishlist
          </h2>

          {/* Foto */}
          {imageUrl ? (
            <div className="relative mb-4 overflow-hidden rounded-xl">
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full object-cover"
                style={{ aspectRatio: "16/9" }}
              />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white text-sm hover:bg-black/80"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="mb-4">
              <UploadPhoto
                subfolder="wishlist"
                label="Subir foto del producto"
                onUpload={(url) => setImageUrl(url)}
              />
            </div>
          )}

          {/* Nombre */}
          <div className="mb-3">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Nombre del producto *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Nike Air Max 97 Blancas"
              maxLength={200}
              required
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
            />
          </div>

          {/* Notas */}
          <div className="mb-5">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Talla, color, modelo exacto, tienda..."
              rows={3}
              maxLength={1000}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
            />
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {saving ? "Guardando..." : "Guardar en wishlist"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-zinc-200 py-3 text-sm font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
