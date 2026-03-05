"use client";

import { useState, useEffect, useRef } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CurrencySelector } from "@/components/currency-selector";

export function DashboardMobileMenu({
  signOutSlot,
  inviteSlot,
}: {
  signOutSlot: React.ReactNode;
  inviteSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={menuRef} className="relative md:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
        aria-label="Abrir menú"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <line x1="2" y1="4.5" x2="16" y2="4.5" />
          <line x1="2" y1="9" x2="16" y2="9" />
          <line x1="2" y1="13.5" x2="16" y2="13.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-zinc-100 bg-white py-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
          {inviteSlot && (
            <div className="px-2 pb-1" onClick={() => setOpen(false)}>
              {inviteSlot}
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Moneda</span>
            <CurrencySelector />
          </div>

          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Tema</span>
            <ThemeToggle />
          </div>

          {inviteSlot && (
            <div className="my-1 mx-2 border-t border-zinc-100 dark:border-zinc-700" />
          )}

          <div className="px-2" onClick={() => setOpen(false)}>
            {signOutSlot}
          </div>
        </div>
      )}
    </div>
  );
}
