"use client";

import { useCurrency } from "@/components/currency-provider";
import { CURRENCY_SYMBOLS, fmtAmount } from "@/lib/constants";
import type { Currency } from "@/lib/constants";
import type { Settlement } from "@/lib/settlement";

type Props = {
  settlements: Settlement[];
  myParticipantId: string;
};

export function MySettlementBanner({ settlements, myParticipantId }: Props) {
  const { convert, displayCurrency, exchangeRates } = useCurrency();
  const sym = (c: string) => CURRENCY_SYMBOLS[c as Currency] ?? c;
  const ratesReady = exchangeRates.status === "ready";

  if (settlements.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white shadow-sm ring-1 ring-black/3 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-800 dark:ring-white/5">
        <span className="text-lg">🎉</span>
        <div>
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">¡Todo al día!</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">No tienes deudas pendientes.</p>
        </div>
      </div>
    );
  }

  type RawPart = {
    sign: 1 | -1;        // +1 = they owe me, -1 = I owe
    currency: string;
    amount: number;      // in original currency
    converted: number;   // in display currency (0 if rates not ready)
  };
  type Row = {
    id: string;
    name: string;
    netDisplay: number;  // signed sum in display currency
    parts: RawPart[];
  };

  const rowMap = new Map<string, Row>();

  for (const s of settlements) {
    const iOwe = s.fromId === myParticipantId;
    const counterpartyId = iOwe ? s.toId : s.fromId;
    const counterpartyName = iOwe ? s.toName : s.fromName;
    const sign: 1 | -1 = iOwe ? -1 : 1;
    const converted = ratesReady ? convert(s.amount, s.currency) : 0;

    if (!rowMap.has(counterpartyId)) {
      rowMap.set(counterpartyId, { id: counterpartyId, name: counterpartyName, netDisplay: 0, parts: [] });
    }
    const row = rowMap.get(counterpartyId)!;
    row.netDisplay += sign * converted;
    row.parts.push({ sign, currency: s.currency, amount: s.amount, converted });
  }

  const rows = Array.from(rowMap.values());

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm ring-1 ring-black/3 overflow-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:ring-white/5">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-700">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Mi liquidación</h3>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
        {rows.map((row) => {
          const theyOweMe = !ratesReady ? row.parts[0].sign > 0 : row.netDisplay > 0;
          const absNet = Math.abs(row.netDisplay);
          const multiCurrency = row.parts.some((p) => p.currency !== displayCurrency);
          const singleSameCurrency = row.parts.length === 1 && row.parts[0].currency === displayCurrency;

          return (
            <div
              key={row.id}
              className={`px-5 py-3.5 ${
                theyOweMe
                  ? "bg-emerald-50/60 dark:bg-emerald-950/20"
                  : "bg-red-50/60 dark:bg-red-950/20"
              }`}
            >
              {/* Main row: name + badge */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm shrink-0 opacity-50">{theyOweMe ? "↓" : "↑"}</span>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {theyOweMe ? (
                      <><span className="font-semibold">{row.name}</span> te debe</>
                    ) : (
                      <>Le debes a <span className="font-semibold">{row.name}</span></>
                    )}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold tabular-nums ${
                    theyOweMe
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                      : "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                  }`}
                >
                  {!ratesReady ? (
                    <span className="text-zinc-400 text-xs font-normal">Cargando...</span>
                  ) : singleSameCurrency ? (
                    `${sym(displayCurrency)}${fmtAmount(row.parts[0].amount, displayCurrency)}`
                  ) : (
                    `${sym(displayCurrency)}${fmtAmount(absNet, displayCurrency)}`
                  )}
                </span>
              </div>

              {/* Breakdown: only when multi-currency or multiple parts */}
              {ratesReady && !singleSameCurrency && (
                <div className="mt-1.5 ml-7 flex flex-wrap gap-x-3 gap-y-0.5">
                  {row.parts.map((p, i) => (
                    <span key={i} className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                      <span className={p.sign > 0 ? "text-emerald-500" : "text-red-400"}>
                        {p.sign > 0 ? "+" : "−"}
                      </span>
                      {sym(p.currency)}{fmtAmount(p.amount, p.currency)}
                      {multiCurrency && p.currency !== displayCurrency && (
                        <span className="text-zinc-300 dark:text-zinc-600">
                          {" "}({sym(displayCurrency)}{fmtAmount(p.converted, displayCurrency)})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
