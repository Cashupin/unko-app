"use client";

import { useCurrency } from "@/providers/currency-provider";
import { CURRENCY_SYMBOLS, fmtAmount } from "@/lib/constants";
import type { Currency } from "@/lib/constants";
import type { Settlement } from "@/modules/expenses/lib/settlement";

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
      <div className="rounded-2xl border border-zinc-100 dark:border-[#2d2d31] bg-white dark:bg-[#1f2023] overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-[#2d2d31]">
          <h3 className="text-[10px] font-bold uppercase tracking-[.07em] text-zinc-400 dark:text-zinc-500">
            Mi liquidación
          </h3>
        </div>
        <div className="px-4 py-3 flex items-center gap-2">
          <span className="text-emerald-500 font-bold">✓</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">¡Todo al día! Sin deudas.</span>
        </div>
      </div>
    );
  }

  type RawPart = {
    sign: 1 | -1;
    currency: string;
    amount: number;
    converted: number;
  };
  type Row = {
    id: string;
    name: string;
    netDisplay: number;
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
    <div className="rounded-2xl border border-zinc-100 dark:border-[#2d2d31] bg-white dark:bg-[#1f2023] overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-[#2d2d31]">
        <h3 className="text-[10px] font-bold uppercase tracking-[.07em] text-zinc-400 dark:text-zinc-500">
          Mi liquidación
        </h3>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-[#2d2d31]">
        {rows.map((row) => {
          const theyOweMe = !ratesReady ? row.parts[0].sign > 0 : row.netDisplay > 0;
          const absNet = Math.abs(row.netDisplay);
          const multiCurrency = row.parts.some((p) => p.currency !== displayCurrency);
          const singleSameCurrency = row.parts.length === 1 && row.parts[0].currency === displayCurrency;

          return (
            <div key={row.id}>
              {/* Main row */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${
                      theyOweMe
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {theyOweMe ? "Te deben" : "Debes"}
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-600 shrink-0 text-xs">→</span>
                  <span className="text-sm font-semibold dark:text-zinc-100 truncate">{row.name}</span>
                </div>
                <span
                  className={`shrink-0 text-sm font-bold tabular-nums ${
                    theyOweMe ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {!ratesReady ? (
                    <span className="text-zinc-400 text-xs font-normal">···</span>
                  ) : singleSameCurrency ? (
                    `${sym(displayCurrency)}${fmtAmount(row.parts[0].amount, displayCurrency)}`
                  ) : (
                    `${sym(displayCurrency)}${fmtAmount(absNet, displayCurrency)}`
                  )}
                </span>
              </div>

              {/* Multi-currency breakdown */}
              {ratesReady && !singleSameCurrency && (
                <div className="ml-19 pb-2 flex flex-wrap gap-x-3 gap-y-0.5">
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
