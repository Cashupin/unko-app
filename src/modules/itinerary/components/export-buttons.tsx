"use client";

import { useState } from "react";
import Link from "next/link";

export function ExportButtons({
  tripId,
  captureRef,
}: {
  tripId: string;
  captureRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [loading, setLoading] = useState(false);

  const handleExportImage = async () => {
    if (!captureRef.current) return;
    setLoading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(captureRef.current, {
        backgroundColor: "#0f1419",
        pixelRatio: 2,
        style: { opacity: "1" },
      });
      const a = document.createElement("a");
      a.download = "itinerario-calendario.png";
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error("export image failed", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="no-export flex items-center gap-2">
      <button
        type="button"
        onClick={handleExportImage}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg border border-[#27272a] bg-[#18191c]/60 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-[#27272a] hover:text-zinc-200 disabled:opacity-50"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {loading ? "Generando…" : "Imagen"}
      </button>
      <Link
        href={`/trips/${tripId}/print`}
        target="_blank"
        className="flex items-center gap-1.5 rounded-lg border border-[#27272a] bg-[#18191c]/60 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-[#27272a] hover:text-zinc-200"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        PDF
      </Link>
    </div>
  );
}
