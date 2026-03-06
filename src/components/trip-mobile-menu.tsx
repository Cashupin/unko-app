"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { CurrencySelector } from "@/components/currency-selector";

const TABS = [
  { id: "home", label: "Inicio", icon: "🏠" },
  { id: "propuestas", label: "Propuestas", icon: "💡" },
  { id: "itinerario", label: "Itinerario", icon: "🗓️" },
  { id: "gastos", label: "Gastos", icon: "💰" },
  { id: "galería", label: "Galería", icon: "📸" },
] as const;

export function TripMobileMenu({
  tripId,
  activeTab,
  tripName,
  isAdmin,
  signOutSlot,
  editSlot,
}: {
  tripId: string;
  activeTab: string;
  tripName: string;
  isAdmin: boolean;
  signOutSlot: React.ReactNode;
  editSlot: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 md:hidden"
        aria-label="Abrir menú"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <line x1="2" y1="4.5" x2="16" y2="4.5" />
          <line x1="2" y1="9" x2="16" y2="9" />
          <line x1="2" y1="13.5" x2="16" y2="13.5" />
        </svg>
      </button>

      {/* Overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer — slides from right */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-white shadow-2xl transition-transform duration-300 dark:bg-zinc-900 md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-700">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {tripName}
          </p>
          <button
            onClick={() => setOpen(false)}
            className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        {/* Sections nav */}
        <nav className="flex flex-col gap-1 px-3 py-4">
          <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Secciones
          </p>
          {TABS.map((tab) => (
            <Link
              key={tab.id}
              href={`/trips/${tripId}?tab=${tab.id}`}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="mx-4 border-t border-zinc-100 dark:border-zinc-700" />

        {/* Options */}
        <div className="flex flex-col gap-2 px-3 py-4">
          <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Opciones
          </p>

          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Moneda</span>
            <CurrencySelector />
          </div>

          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Tema</span>
            <ThemeToggle />
          </div>

          {isAdmin && editSlot && (
            <div className="px-1" onClick={() => setOpen(false)}>
              {editSlot}
            </div>
          )}

          <div className="px-1">
            {signOutSlot}
          </div>
        </div>
      </div>
    </>
  );
}
