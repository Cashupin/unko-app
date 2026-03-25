"use client";

import { useEffect, useRef } from "react";

export type GalleryPhoto = {
  id: string;
  url: string;
  itemTitle: string;
  userName: string | null;
};

export function GalleryLightbox({
  photos,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const photo = photos[index];
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onPrev();
      if (e.key === "ArrowRight" && index < photos.length - 1) onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onClose, onPrev, onNext]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 50 && index > 0) onPrev();
    if (delta < -50 && index < photos.length - 1) onNext();
    touchStartX.current = null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close + counter */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-white/70">
          {index + 1} / {photos.length}
        </span>
        <button
          onClick={onClose}
          className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Cerrar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Prev arrow */}
      {index > 0 && (
        <button
          onClick={onPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-3 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Anterior"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={photo.id}
        src={photo.url}
        alt={`${photo.itemTitle} — ${photo.userName ?? "visita"}`}
        className="max-h-[80vh] max-w-[90vw] object-contain select-none"
        draggable={false}
      />

      {/* Next arrow */}
      {index < photos.length - 1 && (
        <button
          onClick={onNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-3 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Siguiente"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Caption */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-4 text-center">
        <p className="text-sm font-medium text-white">{photo.itemTitle}</p>
        {photo.userName && (
          <p className="mt-0.5 text-xs text-white/60">{photo.userName}</p>
        )}
      </div>
    </div>
  );
}
