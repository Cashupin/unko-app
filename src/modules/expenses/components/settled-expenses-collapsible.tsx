"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "expenses-settled-collapsed";

export function SettledExpensesCollapsible({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-2 text-left group"
      >
        <span className="text-[11px] font-bold uppercase tracking-[.06em] text-zinc-500 dark:text-zinc-500">
          Liquidados · {count}
        </span>
        <svg
          className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-3">
          {children}
        </div>
      )}
    </div>
  );
}
