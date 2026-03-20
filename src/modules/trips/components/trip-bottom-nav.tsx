"use client";

import Link from "next/link";

const LEFT_TABS = [
  { id: "itinerario", label: "Itinerario", icon: "🗓️" },
  { id: "gastos", label: "Gastos", icon: "💰" },
] as const;

const RIGHT_TABS = [
  { id: "actividades", label: "Actividades", icon: "💡" },
  { id: "galería", label: "Galería", icon: "📸" },
] as const;

export function TripBottomNav({
  tripId,
  activeTab,
}: {
  tripId: string;
  activeTab: string;
}) {
  const tabClass = (id: string) =>
    `flex flex-1 flex-col items-center gap-1 px-1 py-3 text-xs font-medium transition-colors ${
      activeTab === id
        ? "text-zinc-900 dark:text-zinc-100"
        : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 md:hidden">
      <div className="flex items-end">
        {LEFT_TABS.map((tab) => (
          <Link key={tab.id} href={`/trips/${tripId}?tab=${tab.id}`} className={tabClass(tab.id)}>
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="leading-none">{tab.label}</span>
          </Link>
        ))}

        {/* Center FAB — Home */}
        <Link
          href={`/trips/${tripId}?tab=home`}
          className="flex flex-col items-center pb-2 px-2"
          style={{ marginTop: "-20px" }}
        >
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg border-2 transition-all ${
              activeTab === "home"
                ? "bg-zinc-900 border-zinc-600 dark:bg-zinc-100 dark:border-zinc-300"
                : "bg-zinc-800 border-zinc-600 dark:bg-zinc-700 dark:border-zinc-500"
            }`}
          >
            <span className="text-2xl leading-none">🏠</span>
          </div>
          <span
            className={`mt-1 text-xs font-semibold leading-none ${
              activeTab === "home"
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-400 dark:text-zinc-500"
            }`}
          >
            Inicio
          </span>
        </Link>

        {RIGHT_TABS.map((tab) => (
          <Link key={tab.id} href={`/trips/${tripId}?tab=${tab.id}`} className={tabClass(tab.id)}>
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="leading-none">{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
