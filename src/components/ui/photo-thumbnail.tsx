"use client";

import { useState } from "react";
import Image from "next/image";

export function PhotoThumbnail({ url, alt }: { url: string; alt: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Thumbnail */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 overflow-hidden rounded-xl ring-1 ring-black/5 hover:ring-2 hover:ring-zinc-400 transition-all focus:outline-none"
        aria-label="Ver foto ampliada"
      >
        <div className="relative h-16 w-16">
          <Image
            src={url}
            alt={alt}
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
      </button>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm font-medium transition-colors"
              aria-label="Cerrar"
            >
              ✕ Cerrar
            </button>

            {/* Image */}
            <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl"
              style={{ aspectRatio: "auto" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={alt}
                className="max-h-[85vh] w-full object-contain rounded-2xl"
              />
            </div>

            {alt && (
              <p className="mt-3 text-center text-sm text-white/60">{alt}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
