"use client";

import { useState, useEffect } from "react";
import { CreateExcursionForm } from "@/modules/itinerary/components/create-excursion-form";

type Section = {
  name: string | null; // null = "Sin categoría"
  count: number;
  slot: React.ReactNode;
};

export function ExcursionSectionsClient({
  sections,
  canEdit,
  tripId,
  existingCategories,
  totalSinFecha,
  totalScheduled,
}: {
  sections: Section[];
  canEdit: boolean;
  tripId: string;
  existingCategories: string[];
  totalSinFecha: number;
  totalScheduled: number;
}) {
  const [sectionCollapsed, setSectionCollapsed] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved: Record<string, boolean> = {};
    sections.forEach((s) => {
      const key = storageKey(s.name);
      if (localStorage.getItem(key) === "true") saved[key] = true;
    });
    setSectionCollapsed(saved);
    setHydrated(true);
  }, []);

  function storageKey(name: string | null) {
    return `itin-exc-section-${name ?? "__none__"}`;
  }

  function toggleSection(name: string | null) {
    const key = storageKey(name);
    setSectionCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(key, String(!!next[key]));
      return next;
    });
  }

  const allCollapsed =
    sections.length > 0 &&
    sections.every((s) => !!sectionCollapsed[storageKey(s.name)]);

  function toggleAll() {
    const collapse = !allCollapsed;
    const next: Record<string, boolean> = {};
    sections.forEach((s) => {
      const key = storageKey(s.name);
      next[key] = collapse;
      localStorage.setItem(key, String(collapse));
    });
    setSectionCollapsed(next);
  }

  const total = totalSinFecha + totalScheduled;

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          {totalSinFecha > 0 && `${totalSinFecha} sin fecha`}
          {totalSinFecha > 0 && totalScheduled > 0 && " · "}
          {totalScheduled > 0 &&
            `${totalScheduled} programada${totalScheduled !== 1 ? "s" : ""}`}
          {total === 0 && "Sin excursiones todavía"}
        </p>
        <div className="flex items-center gap-2">
          {sections.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700 dark:border-[#3f3f46] dark:hover:bg-zinc-800/50 dark:hover:text-zinc-300"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                {allCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                )}
              </svg>
              {allCollapsed ? "Expandir todo" : "Colapsar todo"}
            </button>
          )}
          {canEdit && (
            <CreateExcursionForm tripId={tripId} existingCategories={existingCategories} />
          )}
        </div>
      </div>

      {/* Empty state */}
      {sections.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-zinc-800 p-12 text-center">
          <p className="mb-2 text-3xl">🗺️</p>
          <p className="text-sm font-medium text-zinc-400">Sin excursiones todavía</p>
          <p className="mt-1 text-xs text-zinc-600">
            Añade salidas de día (Kamakura, Fuji…) y asígnales fecha cuando tengas las entradas
          </p>
        </div>
      )}

      {/* Sections */}
      {sections.map((section) => {
        const key = storageKey(section.name);
        const isCollapsed = hydrated && !!sectionCollapsed[key];
        const isUncategorized = section.name === null;
        const displayName = section.name ?? "Sin categoría";

        return (
          <div key={key}>
            {/* Section header */}
            <button
              type="button"
              onClick={() => toggleSection(section.name)}
              className="group mb-3 flex w-full items-center gap-2"
            >
              <span
                className={`whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.09em] transition-colors ${
                  isUncategorized
                    ? "text-zinc-600 group-hover:text-zinc-500"
                    : "text-zinc-500 group-hover:text-zinc-400"
                }`}
              >
                {displayName}
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-1.5 py-px text-[10px] text-zinc-600">
                {section.count}
              </span>
              <div className="h-px flex-1 bg-zinc-800/60" />
              <svg
                className={`h-2.5 w-2.5 text-zinc-600 transition-transform duration-200 ${
                  isCollapsed ? "-rotate-90" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Section body */}
            {!isCollapsed && (
              <div className="flex flex-col gap-3">{section.slot}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
