"use client";

import { useState, useEffect } from "react";

export function UnscheduledCollapsible({
  tripId,
  count,
  children,
}: {
  tripId: string;
  count: number;
  children: React.ReactNode;
}) {
  const storageKey = `itinerary-unscheduled-${tripId}`;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) setOpen(stored === "true");
  }, [storageKey]);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      localStorage.setItem(storageKey, String(next));
      return next;
    });
  };

  if (count === 0) return null;

  return (
    <div className="rounded-2xl border border-[#27272a] bg-[#18191c] overflow-hidden">
      <button
        onClick={toggle}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 md:px-5 md:py-4 ${open ? "border-b border-[#27272a]" : ""}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#27272a]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-500"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="8" y1="15" x2="16" y2="15" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-zinc-300">Por programar</p>
            <p className="text-xs text-zinc-500">
              {count} actividad{count !== 1 ? "es" : ""} sin fecha asignada
            </p>
          </div>
        </div>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="currentColor"
          className={`shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M5 6.5L1 2.5h8L5 6.5z" />
        </svg>
      </button>

      {open && (
        <div className="flex flex-col gap-2 p-3">
          {children}
        </div>
      )}
    </div>
  );
}
