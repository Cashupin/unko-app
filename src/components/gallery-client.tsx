"use client";

import { useState } from "react";
import { toast } from "sonner";
import { GalleryLightbox, type GalleryPhoto } from "@/components/gallery-lightbox";

export function GalleryClient({
  photos,
  tripName,
}: {
  photos: GalleryPhoto[];
  tripName: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelected(new Set());
  }

  function togglePhoto(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(photos.map((p) => p.id)));
  }

  async function handleDownload() {
    const selectedPhotos = photos.filter((p) => selected.has(p.id));
    if (selectedPhotos.length === 0) return;

    setDownloading(true);
    try {
      const res = await fetch("/api/gallery/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: selectedPhotos.map((p) => p.url),
          tripName,
        }),
      });

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Error al generar el ZIP");
        return;
      }

      // Trigger download
      const a = document.createElement("a");
      a.href = data.url;
      a.click();

      toast.success(`Descargando ${selectedPhotos.length} foto${selectedPhotos.length !== 1 ? "s" : ""}…`);
      setSelectMode(false);
      setSelected(new Set());
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      {/* Header controls */}
      <div className="mb-4 flex items-center justify-end">
        <button
          onClick={toggleSelectMode}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            selectMode
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
          }`}
        >
          {selectMode ? "Cancelar" : "Seleccionar"}
        </button>
      </div>

      {/* Photo grid */}
      <div className="flex flex-wrap gap-2">
        {photos.map((photo, i) => {
          const isSelected = selected.has(photo.id);
          return (
            <button
              key={photo.id}
              onClick={() => selectMode ? togglePhoto(photo.id) : setOpenIndex(i)}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border transition-all focus:outline-none sm:h-24 sm:w-24 ${
                isSelected
                  ? "border-zinc-900 ring-2 ring-zinc-900 dark:border-zinc-100 dark:ring-zinc-100"
                  : "border-zinc-200 hover:ring-2 hover:ring-zinc-400 dark:border-zinc-700 dark:hover:ring-zinc-500"
              }`}
              aria-label={`${selectMode ? (isSelected ? "Deseleccionar" : "Seleccionar") : "Ver"} foto de ${photo.itemTitle}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={`${photo.itemTitle} — ${photo.userName ?? "visita"}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />

              {/* User name overlay */}
              {photo.userName && !selectMode && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-center">
                  <span className="truncate text-[9px] font-medium text-white">
                    {photo.userName}
                  </span>
                </div>
              )}

              {/* Selection overlay */}
              {selectMode && (
                <div className={`absolute inset-0 flex items-center justify-center transition-colors ${
                  isSelected ? "bg-black/40" : "bg-transparent hover:bg-black/10"
                }`}>
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected
                      ? "border-white bg-zinc-900 dark:bg-zinc-100"
                      : "border-white bg-black/30"
                  }`}>
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={`currentColor`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white dark:text-zinc-900">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Floating action bar */}
      {selectMode && (
        <div className="fixed bottom-16 left-0 right-0 z-40 flex items-center justify-between gap-3 border-t border-zinc-200 bg-white px-4 py-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 md:bottom-0">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {selected.size} seleccionada{selected.size !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              Seleccionar todo
            </button>
            <button
              onClick={handleDownload}
              disabled={selected.size === 0 || downloading}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {downloading ? "Generando ZIP…" : "Descargar ZIP"}
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {openIndex !== null && (
        <GalleryLightbox
          photos={photos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onPrev={() => setOpenIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setOpenIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : i))}
        />
      )}
    </>
  );
}
