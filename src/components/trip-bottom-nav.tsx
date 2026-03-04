"use client";

import Link from "next/link";

const TABS = [
  { id: "propuestas", label: "Propuestas", icon: "💡" },
  { id: "itinerario", label: "Itinerario", icon: "🗓️" },
  { id: "hoteles", label: "Hoteles", icon: "🏨" },
  { id: "gastos", label: "Gastos", icon: "💰" },
] as const;

export function TripBottomNav({
  tripId,
  activeTab,
}: {
  tripId: string;
  activeTab: string;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 md:hidden">
      <div className="flex">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/trips/${tripId}?tab=${tab.id}`}
            className={`flex flex-1 flex-col items-center gap-1 px-1 py-3 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            }`}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="leading-none">{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
