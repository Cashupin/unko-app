"use client";

import { useState } from "react";

type Props = {
  editSlot: React.ReactNode;
  deleteSlot: React.ReactNode;
};

export function TripHeaderMenu({ editSlot, deleteSlot }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative hidden md:block">
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="relative z-20 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700"
      >
        Editar viaje
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 w-48 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl overflow-hidden">
          <div className="px-3 py-2 flex flex-col gap-0.5">
            {editSlot}
            {deleteSlot}
          </div>
        </div>
      )}
    </div>
  );
}
