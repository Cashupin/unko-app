"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { Currency } from "@/lib/constants";

// ─── Exchange rates ────────────────────────────────────────────────────────────

type Rates = Record<string, number>; // base: USD

type ExchangeRatesState =
  | { status: "loading" }
  | { status: "ready"; rates: Rates; date: string }
  | { status: "error" };

// Module-level cache so all components share one fetch
let cachedRates: ExchangeRatesState = { status: "loading" };
let fetchPromise: Promise<void> | null = null;

function fetchRates(): Promise<void> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/exchange-rates")
    .then((r) => r.json())
    .then((data: { base: string; date: string; rates: Rates }) => {
      cachedRates = { status: "ready", rates: data.rates, date: data.date };
    })
    .catch(() => {
      cachedRates = { status: "error" };
      fetchPromise = null; // allow retry
    });
  return fetchPromise;
}

/** Convert `amount` from `from` currency to `to` currency using USD as pivot. */
export function convertAmount(amount: number, from: string, to: string, rates: Rates): number {
  if (from === to) return amount;
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  // amount (from) → USD → to
  return (amount / fromRate) * toRate;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const LS_KEY = "unko_display_currency";
const DEFAULT_CURRENCY: Currency = "CLP";

type CurrencyContextValue = {
  displayCurrency: Currency;
  setDisplayCurrency: (c: Currency) => void;
  exchangeRates: ExchangeRatesState;
  convert: (amount: number, from: string) => number;
};

const CurrencyContext = createContext<CurrencyContextValue>({
  displayCurrency: DEFAULT_CURRENCY,
  setDisplayCurrency: () => {},
  exchangeRates: { status: "loading" },
  convert: (amount) => amount,
});

export function useCurrency() {
  return useContext(CurrencyContext);
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
  const [rates, setRates] = useState<ExchangeRatesState>(cachedRates);
  const mounted = useRef(false);

  // Read from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    mounted.current = true;
    const stored = localStorage.getItem(LS_KEY) as Currency | null;
    if (stored) setDisplayCurrencyState(stored);
  }, []);

  // Fetch exchange rates once
  useEffect(() => {
    if (cachedRates.status === "ready") {
      setRates(cachedRates);
      return;
    }
    fetchRates().then(() => setRates({ ...cachedRates }));
  }, []);

  const setDisplayCurrency = useCallback((c: Currency) => {
    setDisplayCurrencyState(c);
    localStorage.setItem(LS_KEY, c);
  }, []);

  const convert = useCallback(
    (amount: number, from: string) => {
      if (rates.status !== "ready") return amount;
      return convertAmount(amount, from, displayCurrency, rates.rates);
    },
    [rates, displayCurrency],
  );

  return (
    <CurrencyContext.Provider value={{ displayCurrency, setDisplayCurrency, exchangeRates: rates, convert }}>
      {children}
    </CurrencyContext.Provider>
  );
}
