"use client";

import { useState } from "react";

export function PastDaysCollapsible({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (count === 0) return null;

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-600 hover:text-zinc-400 hover:bg-white/5 transition-colors dark:text-zinc-600 dark:hover:text-zinc-400"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="currentColor"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M5 6.5L1 2.5h8L5 6.5z" />
        </svg>
        {count} día{count !== 1 ? "s" : ""} anterior{count !== 1 ? "es" : ""}
      </button>

      {open && (
        <div className="flex flex-col gap-3 mt-2">
          {children}
        </div>
      )}
    </div>
  );
}
