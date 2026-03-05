"use client";

import { useEffect, useState } from "react";
import { CURRENCY_SYMBOLS, fmtAmount } from "@/lib/constants";
import type { Currency } from "@/lib/constants";
import { ConvertedAmount } from "@/components/converted-amount";

type ParticipantTotal = {
  id: string;
  name: string;
  totals: { currency: string; amount: number }[];
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ExpenseSummary({ rows }: { rows: ParticipantTotal[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("expenseSummaryOpen");
    if (stored !== null) setOpen(stored === "true");
  }, []);

  function toggle() {
    setOpen((v) => {
      localStorage.setItem("expenseSummaryOpen", String(!v));
      return !v;
    });
  }

  const sym = (c: string) => CURRENCY_SYMBOLS[c as Currency] ?? c;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Gasto por participante
        </div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-700">
          {rows.length === 0 ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">Sin gastos registrados.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-700"
                >
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{row.name}</span>
                  <div className="flex items-center gap-2">
                    {row.totals.map((t) => (
                      <span key={t.currency} className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                        <ConvertedAmount amount={t.amount} currency={t.currency} />
                      </span>
                    ))}
                    {row.totals.length === 0 && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
