"use client";

import { useState, useEffect } from "react";

const LS_KEY = "itinerario_hoteles_open";

export function HotelCollapsible({
  hotelListSlot,
  createSlot,
  autoOpen,
}: {
  hotelListSlot: React.ReactNode;
  createSlot?: React.ReactNode;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (autoOpen) {
      setOpen(true);
      return;
    }
    const stored = localStorage.getItem(LS_KEY);
    if (stored !== null) setOpen(stored === "true");
  }, [autoOpen]);

  function toggle() {
    setOpen((v) => {
      const next = !v;
      localStorage.setItem(LS_KEY, String(next));
      return next;
    });
  }

  if (!mounted) {
    // Avoid layout shift — render the toggle button only
    return (
      <div className="mb-6">
        <div className="h-10 w-48 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex flex-col gap-2">
        <button
          onClick={toggle}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <span>🏨</span>
          <span>Alojamiento</span>
          <span className="text-zinc-400 dark:text-zinc-500 text-xs ml-1">
            {open ? "▲" : "▼"}
          </span>
        </button>
        {open && createSlot && <div className="flex justify-end">{createSlot}</div>}
      </div>

      {open && <div className="mt-4">{hotelListSlot}</div>}
    </div>
  );
}
