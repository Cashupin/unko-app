"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

// State: isDayCollapsed(date) = isGlobal XOR overrides.has(date)
// - Global=false (default): expand all; days in overrides are collapsed
// - Global=true (collapse all): collapse all; days in overrides are expanded back
// This means individual toggles work correctly in both directions.

const GLOBAL_KEY = "itin-collapse-global";
const OVERRIDES_KEY = "itin-collapse-overrides";

type Ctx = {
  isGlobalCollapsed: boolean;
  isDayCollapsed: (date: string) => boolean;
  toggleDay: (date: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
};

const DayCollapseContext = createContext<Ctx>({
  isGlobalCollapsed: false,
  isDayCollapsed: () => false,
  toggleDay: () => {},
  collapseAll: () => {},
  expandAll: () => {},
});

export function DayCollapseProvider({ children }: { children: React.ReactNode }) {
  const [isGlobal, setIsGlobal] = useState(false);
  const [overrides, setOverrides] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const g = localStorage.getItem(GLOBAL_KEY) === "true";
    const o = JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? "[]") as string[];
    setIsGlobal(g);
    setOverrides(new Set(o));
    setMounted(true);
  }, []);

  // XOR: collapsed iff global and not overridden, or not global and overridden
  const isDayCollapsed = useCallback(
    (date: string) => mounted && isGlobal !== overrides.has(date),
    [isGlobal, overrides, mounted]
  );

  const toggleDay = useCallback((date: string) => {
    setOverrides((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setIsGlobal(true);
    setOverrides(new Set());
    localStorage.setItem(GLOBAL_KEY, "true");
    localStorage.setItem(OVERRIDES_KEY, "[]");
  }, []);

  const expandAll = useCallback(() => {
    setIsGlobal(false);
    setOverrides(new Set());
    localStorage.setItem(GLOBAL_KEY, "false");
    localStorage.setItem(OVERRIDES_KEY, "[]");
  }, []);

  return (
    <DayCollapseContext.Provider
      value={{ isGlobalCollapsed: isGlobal, isDayCollapsed, toggleDay, collapseAll, expandAll }}
    >
      {children}
    </DayCollapseContext.Provider>
  );
}

// ─── Collapse all / expand all button (for action bar) ────────────────────────

export function CollapseAllButton() {
  const { isGlobalCollapsed, collapseAll, expandAll } = useContext(DayCollapseContext);

  return (
    <button
      type="button"
      onClick={isGlobalCollapsed ? expandAll : collapseAll}
      title={isGlobalCollapsed ? "Expandir todos los días" : "Colapsar todos los días"}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
        isGlobalCollapsed
          ? "border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
          : "border-zinc-700 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
      }`}
    >
      {isGlobalCollapsed ? (
        <>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
          </svg>
          Expandir
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
          Colapsar
        </>
      )}
    </button>
  );
}

// ─── Day badge collapse button ────────────────────────────────────────────────
// The date badge itself becomes the toggle — large tap target, no conflict with
// hotel chips or the "add activity" button on the right.

export function DayBadgeCollapseButton({
  dateStr,
  weekday,
  dayNum,
  isToday,
  isPast,
}: {
  dateStr: string;
  weekday: string;
  dayNum: number;
  isToday: boolean;
  isPast: boolean;
}) {
  const { isDayCollapsed, toggleDay } = useContext(DayCollapseContext);
  const collapsed = isDayCollapsed(dateStr);

  return (
    <button
      type="button"
      onClick={() => toggleDay(dateStr)}
      aria-label={collapsed ? "Expandir día" : "Colapsar día"}
      className={`group/badge relative flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl transition-all duration-150 ${
        isToday
          ? "bg-linear-to-br from-violet-600 to-indigo-600 text-white"
          : isPast
          ? "bg-[#27272a] text-zinc-500"
          : "bg-zinc-100 text-zinc-900"
      } ${collapsed ? "opacity-50" : ""}`}
    >
      {/* Normal content — fades on hover */}
      <span className="text-[8.5px] font-bold leading-none tracking-widest uppercase opacity-65 transition-opacity duration-150 group-hover/badge:opacity-0">
        {weekday}
      </span>
      <span className="text-[17px] font-extrabold leading-tight transition-opacity duration-150 group-hover/badge:opacity-0">
        {dayNum}
      </span>

      {/* Chevron overlay — appears on hover */}
      <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover/badge:opacity-100">
        <svg
          className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </button>
  );
}

// ─── Collapsible body wrapper ─────────────────────────────────────────────────

export function CollapsibleDayBody({
  dateStr,
  children,
}: {
  dateStr: string;
  children: React.ReactNode;
}) {
  const { isDayCollapsed } = useContext(DayCollapseContext);
  return <div className={isDayCollapsed(dateStr) ? "hidden" : ""}>{children}</div>;
}
