"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

const MORE_TABS = [
  { id: "checklist", label: "Checklist", icon: "✅" },
  { id: "listas", label: "Listas", icon: "📋" },
  { id: "galería", label: "Galería", icon: "📸" },
  { id: "wishlist", label: "Wishlist", icon: "🎁" },
] as const;

export function TripMoreDropdown({
  tripId,
  activeTab,
}: {
  tripId: string;
  activeTab: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = MORE_TABS.some((t) => t.id === activeTab);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1 ${
          isActive
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-700"
        }`}
      >
        Más
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[140px] rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          {MORE_TABS.map((tab) => (
            <Link
              key={tab.id}
              href={`/trips/${tripId}?tab=${tab.id}`}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium first:rounded-t-xl last:rounded-b-xl transition-colors ${
                activeTab === tab.id
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700/60"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
