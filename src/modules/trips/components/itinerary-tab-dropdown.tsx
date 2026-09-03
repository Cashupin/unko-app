"use client";

import { useState } from "react";
import Link from "next/link";

const SUBTABS = [
  {
    id: "itinerario",
    label: "Itinerario",
    grad: "from-indigo-500 to-blue-700",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    id: "alojamiento",
    label: "Alojamiento",
    grad: "from-orange-400 to-red-500",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z"/><path d="M6 12H4a2 2 0 0 0-2 2v8h4"/><path d="M18 9h2a2 2 0 0 1 2 2v11h-4"/><line x1="10" y1="6" x2="14" y2="6"/><line x1="10" y1="10" x2="14" y2="10"/>
      </svg>
    ),
  },
  {
    id: "transporte",
    label: "Transporte",
    grad: "from-cyan-400 to-blue-600",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="12" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="7" cy="20" r="1.5" fill="white" stroke="none"/><circle cx="17" cy="20" r="1.5" fill="white" stroke="none"/><line x1="7" y1="19" x2="7" y2="17"/><line x1="17" y1="19" x2="17" y2="17"/>
      </svg>
    ),
  },
  {
    id: "entradas",
    label: "Entradas",
    grad: "from-red-500 to-rose-700",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line x1="9" y1="9" x2="9" y2="15" strokeDasharray="2 2"/>
      </svg>
    ),
  },
  {
    id: "excursiones",
    label: "Jornadas",
    grad: "from-emerald-400 to-green-600",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
      </svg>
    ),
  },
] as const;

type Props = {
  tripId: string;
  activeTab: string;
  activeSubtab: string;
  tabIcon: React.ReactNode;
};

export function ItineraryTabDropdown({ tripId, activeTab, activeSubtab, tabIcon }: Props) {
  const [open, setOpen] = useState(false);
  const isActive = activeTab === "itinerario";

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {/* Tab principal */}
      <Link
        href={`/trips/${tripId}?tab=itinerario`}
        id="tutorial-tab-itinerario"
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          isActive
            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-700"
        }`}
      >
        {tabIcon}
        Itinerario
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-50">
          <path d="M2 4l4 4 4-4" />
        </svg>
      </Link>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full pt-1 z-50">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800 overflow-hidden min-w-40">
            {SUBTABS.map((sub) => {
              const subActive = isActive && activeSubtab === sub.id;
              return (
                <Link
                  key={sub.id}
                  href={`/trips/${tripId}?tab=itinerario&subtab=${sub.id}`}
                  className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                    subActive
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700/60"
                  }`}
                >
                  <span className={`flex items-center justify-center rounded-md bg-linear-to-br ${sub.grad} shrink-0`}
                    style={{ width: 22, height: 22 }}>
                    {sub.icon}
                  </span>
                  {sub.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
