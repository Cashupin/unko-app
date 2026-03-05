"use client";

import { useEffect, useState } from "react";
import { useCurrency } from "@/components/currency-provider";
import { CURRENCY_SYMBOLS, CURRENCY_DECIMALS } from "@/lib/constants";
import type { Currency } from "@/lib/constants";

function fmt(amount: number, currency: string) {
  const decimals = CURRENCY_DECIMALS[currency as Currency] ?? 2;
  const symbol = CURRENCY_SYMBOLS[currency as Currency] ?? currency;
  return `${symbol}${amount.toLocaleString("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

type Props = {
  amount: number;
  currency: string;
  /** Extra classes for the wrapper span */
  className?: string;
};

/**
 * Displays an amount in its original currency.
 * If the user's display currency differs, appends the converted value.
 *
 * Example: ¥100.000 → $58.000
 */
export function ConvertedAmount({ amount, currency, className }: Props) {
  const { displayCurrency, convert, exchangeRates } = useCurrency();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const original = fmt(amount, currency);

  if (!mounted || exchangeRates.status !== "ready" || currency === displayCurrency) {
    return <span className={className}>{original}</span>;
  }

  const converted = convert(amount, currency);

  return (
    <span className={className}>
      {original}
      <span className="text-zinc-400 dark:text-zinc-500">
        {" "}→ {fmt(converted, displayCurrency)}
      </span>
    </span>
  );
}
