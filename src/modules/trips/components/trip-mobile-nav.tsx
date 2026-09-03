"use client";

import { useState } from "react";
import { useSheetHistoryOpen } from "@/lib/use-sheet-history";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useCurrency } from "@/providers/currency-provider";
import { CURRENCIES, CURRENCY_NAMES } from "@/lib/constants";
import type { Currency } from "@/lib/constants";

// ── SVG icons (white, 26×26, stroke-based) ─────────────────────────────────
function Icon({ id, size = 26 }: { id: string; size?: number }) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: "white", strokeWidth: 2,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  switch (id) {
    case "home":
      return <svg {...p}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>;
    case "propuestas":
      return <svg {...p}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26A7 7 0 0 1 5 9a7 7 0 0 1 7-7z"/></svg>;
    case "gastos":
      return <svg {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    case "checklist":
      return <svg {...p}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
    case "listas":
      return <svg {...p}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="white" stroke="none"/><circle cx="3" cy="12" r="1" fill="white" stroke="none"/><circle cx="3" cy="18" r="1" fill="white" stroke="none"/></svg>;
    case "galería":
      return <svg {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
    case "wishlist":
      return <svg {...p}><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M21 8H3"/><path d="M12 8v13"/><path d="M8.5 8C7.1 8 6 6.9 6 5.5S7.1 3 8.5 3c2.1 0 3.5 5 3.5 5s-1.4 0-3.5 0z"/><path d="M15.5 8C16.9 8 18 6.9 18 5.5S16.9 3 15.5 3C13.4 3 12 8 12 8s1.4 0 3.5 0z"/></svg>;
    case "itinerario":
      return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case "alojamiento":
      return <svg {...p}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z"/><path d="M6 12H4a2 2 0 0 0-2 2v8h4"/><path d="M18 9h2a2 2 0 0 1 2 2v11h-4"/><line x1="10" y1="6" x2="14" y2="6"/><line x1="10" y1="10" x2="14" y2="10"/><line x1="10" y1="14" x2="14" y2="14"/></svg>;
    case "transporte":
      return <svg {...p}><rect x="2" y="5" width="20" height="12" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="7" cy="20" r="1.5" fill="white" stroke="none"/><circle cx="17" cy="20" r="1.5" fill="white" stroke="none"/><line x1="7" y1="19" x2="7" y2="17"/><line x1="17" y1="19" x2="17" y2="17"/></svg>;
    case "entradas":
      return <svg {...p}><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line x1="9" y1="9" x2="9" y2="15" strokeDasharray="2 2"/></svg>;
    case "excursiones":
      return <svg {...p}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
    default:
      return null;
  }
}

// ── Data ────────────────────────────────────────────────────────────────────
const MAIN_SECTIONS = [
  { id: "home",       label: "Inicio",     grad: "from-blue-500 to-indigo-600" },
  { id: "propuestas", label: "Propuestas", grad: "from-amber-400 to-orange-500" },
  { id: "gastos",     label: "Gastos",     grad: "from-green-500 to-emerald-600" },
  { id: "checklist",  label: "Checklist",  grad: "from-teal-400 to-cyan-600" },
  { id: "listas",     label: "Listas",     grad: "from-violet-500 to-purple-600" },
  { id: "galería",    label: "Galería",    grad: "from-rose-400 to-pink-600" },
  { id: "wishlist",   label: "Wishlist",   grad: "from-orange-400 to-red-500" },
] as const;

const ITINERARY_SUBTABS = [
  { id: "itinerario",  label: "Itinerario",  grad: "from-indigo-500 to-blue-700" },
  { id: "alojamiento", label: "Alojamiento", grad: "from-orange-400 to-red-500" },
  { id: "transporte",  label: "Transporte",  grad: "from-cyan-400 to-blue-600" },
  { id: "entradas",    label: "Entradas",    grad: "from-red-500 to-rose-700" },
  { id: "excursiones", label: "Jornadas", grad: "from-emerald-400 to-green-600" },
] as const;

const SECONDARY_TABS = new Set(["checklist", "listas", "galería", "wishlist"]);

// ── Component ───────────────────────────────────────────────────────────────
export function TripMobileNav({
  tripId,
  activeTab,
  activeSubtab,
  isAdmin,
  adminIconsSlot,
  signOutSlot,
}: {
  tripId: string;
  activeTab: string;
  activeSubtab: string;
  isAdmin: boolean;
  adminIconsSlot?: React.ReactNode;
  signOutSlot: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  useSheetHistoryOpen(menuOpen, () => setMenuOpen(false));
  const [optionsOpen, setOptionsOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("menu-options-open") === "1";
  });

  function toggleOptions() {
    setOptionsOpen((v) => {
      const next = !v;
      localStorage.setItem("menu-options-open", next ? "1" : "0");
      return next;
    });
  }
  const { displayCurrency, setDisplayCurrency } = useCurrency();

  const menuActive = SECONDARY_TABS.has(activeTab);


  const tabClass = (id: string) =>
    `flex flex-1 flex-col items-center gap-1 px-1 py-3 text-xs font-medium transition-colors ${
      activeTab === id
        ? "text-zinc-900 dark:text-zinc-100"
        : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
    }`;

  const iconBg = (grad: string, active: boolean) =>
    `relative flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-gradient-to-br ${grad} shadow-sm transition-transform active:scale-95 ${
      active ? "scale-105 ring-[3px] ring-white/60 dark:ring-white/40" : ""
    }`;

  return (
    <>
      {/* ── Bottom nav bar ──────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 md:hidden">
        <div className="flex items-end">

          <Link href={`/trips/${tripId}?tab=itinerario`} className={tabClass("itinerario")}>
            <span className="text-xl leading-none">🗓️</span>
            <span className="leading-none">Itinerario</span>
          </Link>
          <Link href={`/trips/${tripId}?tab=gastos`} className={tabClass("gastos")}>
            <span className="text-xl leading-none">💰</span>
            <span className="leading-none">Gastos</span>
          </Link>

          {/* Center FAB */}
          <Link href={`/trips/${tripId}?tab=home`} className="flex flex-col items-center pb-2 px-2" style={{ marginTop: "-20px" }}>
            <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 shadow-lg transition-all ${
              activeTab === "home"
                ? "border-zinc-600 bg-zinc-900 dark:border-zinc-300 dark:bg-zinc-100"
                : "border-zinc-600 bg-zinc-800 dark:border-zinc-500 dark:bg-zinc-700"
            }`}>
              <span className="text-2xl leading-none">🏠</span>
            </div>
            <span className={`mt-1 text-xs font-semibold leading-none ${
              activeTab === "home" ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"
            }`}>Inicio</span>
          </Link>

          <Link href={`/trips/${tripId}?tab=propuestas`} className={tabClass("propuestas")}>
            <span className="text-xl leading-none">💡</span>
            <span className="leading-none">Propuestas</span>
          </Link>
          <button
            onClick={() => setMenuOpen(true)}
            className={`flex flex-1 flex-col items-center gap-1 px-1 py-3 text-xs font-medium transition-colors ${
              menuActive || menuOpen ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect x="1" y="1" width="8" height="8" rx="2"/>
              <rect x="11" y="1" width="8" height="8" rx="2"/>
              <rect x="1" y="11" width="8" height="8" rx="2"/>
              <rect x="11" y="11" width="8" height="8" rx="2"/>
            </svg>
            <span className="leading-none">Menú</span>
          </button>
        </div>
      </nav>

      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMenuOpen(false)}
      />

      {/* ── Menu bottom sheet ────────────────────────────────────────────── */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 min-h-[90vh] max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 dark:bg-zinc-950 md:hidden ${
        menuOpen ? "translate-y-0" : "translate-y-full"
      }`}>
        {/* Botón cerrar */}
        <div className="sticky top-0 z-10 flex justify-center bg-white pt-2 pb-1 dark:bg-zinc-950">
          <button
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-center rounded-full p-3 text-zinc-400 transition-colors active:bg-zinc-100 dark:text-zinc-500 dark:active:bg-zinc-800"
            aria-label="Cerrar menú"
          >
            <svg width="56" height="16" viewBox="0 0 56 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8l24 12 24-12"/>
            </svg>
          </button>
        </div>

        <div className="px-4 pb-10 pt-3">

          {/* Secciones */}
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Secciones</p>
          <div className="grid grid-cols-4 gap-x-2 gap-y-4 mb-6">
            {MAIN_SECTIONS.map((s) => {
              const active = activeTab === s.id;
              return (
                <Link key={s.id} href={`/trips/${tripId}?tab=${s.id}`} onClick={() => setMenuOpen(false)} className="flex flex-col items-center gap-1.5">
                  <div className={iconBg(s.grad, active)}>
                    <Icon id={s.id} size={24} />
                    {active && <div className="absolute -bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-zinc-800 dark:bg-zinc-200"/>}
                  </div>
                  <span className={`text-[10px] font-semibold text-center leading-tight ${active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"}`}>
                    {s.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Itinerario */}
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Itinerario</p>
          <div className="grid grid-cols-4 gap-x-2 gap-y-4 mb-6">
            {ITINERARY_SUBTABS.map((sub) => {
              const active = activeTab === "itinerario" && activeSubtab === sub.id;
              return (
                <Link key={sub.id} href={`/trips/${tripId}?tab=itinerario&subtab=${sub.id}`} onClick={() => setMenuOpen(false)} className="flex flex-col items-center gap-1.5">
                  <div className={iconBg(sub.grad, active)}>
                    <Icon id={sub.id} size={24} />
                    {active && <div className="absolute -bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-zinc-800 dark:bg-zinc-200"/>}
                  </div>
                  <span className={`text-[10px] font-semibold text-center leading-tight ${active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"}`}>
                    {sub.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className="mb-4 border-t border-zinc-100 dark:border-zinc-800"/>

          {/* Opciones — colapsable */}
          <button
            onClick={toggleOptions}
            className="flex w-full items-center justify-between mb-3"
          >
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Opciones</p>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${optionsOpen ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {optionsOpen && (
            <div className="flex flex-col gap-3">
              {/* Moneda + Tema — horizontal */}
              <div className="flex gap-3">
                <div className="flex-1 rounded-2xl border border-zinc-100 px-3 py-3 dark:border-zinc-800">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Moneda</p>
                  <select
                    value={displayCurrency}
                    onChange={(e) => setDisplayCurrency(e.target.value as Currency)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c} — {CURRENCY_NAMES[c]}</option>)}
                  </select>
                </div>
                <div className="flex flex-col items-center justify-between rounded-2xl border border-zinc-100 px-4 py-3 dark:border-zinc-800">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Tema</p>
                  <ThemeToggle/>
                </div>
              </div>

              {/* Admin — Viaje */}
              {isAdmin && adminIconsSlot && (
                <div>
                  <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Viaje</p>
                  <div onClick={() => setMenuOpen(false)}>{adminIconsSlot}</div>
                </div>
              )}

              {/* Cerrar sesión */}
              <div className="overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800">
                {signOutSlot}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
