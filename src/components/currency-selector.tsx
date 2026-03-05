"use client";

import { useEffect, useState } from "react";
import { useCurrency } from "@/components/currency-provider";
import { CURRENCIES, CURRENCY_NAMES } from "@/lib/constants";
import type { Currency } from "@/lib/constants";

export function CurrencySelector() {
  const { displayCurrency, setDisplayCurrency } = useCurrency();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-8 w-[72px]" />;
  }

  return (
    <select
      value={displayCurrency}
      onChange={(e) => setDisplayCurrency(e.target.value as Currency)}
      className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:focus:ring-zinc-500"
      title="Moneda de visualización"
      aria-label="Moneda de visualización"
    >
      {CURRENCIES.map((c) => (
        <option key={c} value={c}>
          {c} — {CURRENCY_NAMES[c]}
        </option>
      ))}
    </select>
  );
}
