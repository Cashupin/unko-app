"use client";

import { useCurrency } from "@/providers/currency-provider";
import { CURRENCY_SYMBOLS, fmtAmount } from "@/lib/constants";
import type { Currency } from "@/lib/constants";
import type { Settlement } from "@/lib/settlement";

type Props = {
  expenseTotals: { amount: number; currency: string }[];
  myShares: { amount: number; currency: string }[];
  mySettlements: Settlement[];
  myParticipantId: string;
  activeCount: number;
  participantCount: number;
};

export function ExpenseStatsCard({
  expenseTotals,
  myShares,
  mySettlements,
  myParticipantId,
  activeCount,
  participantCount,
}: Props) {
  const { convert, displayCurrency, exchangeRates } = useCurrency();
  const sym = (c: string) => CURRENCY_SYMBOLS[c as Currency] ?? c;
  const ratesReady = exchangeRates.status === "ready";

  const total = ratesReady
    ? expenseTotals.reduce((sum, e) => sum + convert(e.amount, e.currency), 0)
    : 0;

  const myShare = ratesReady
    ? myShares.reduce((sum, s) => sum + convert(s.amount, s.currency), 0)
    : 0;

  // net from mySettlements: positive = they owe me, negative = I owe
  const pending = ratesReady
    ? mySettlements.reduce((sum, s) => {
        const sign = s.fromId === myParticipantId ? -1 : 1;
        return sum + sign * convert(s.amount, s.currency);
      }, 0)
    : 0;

  const pendingColor =
    !ratesReady
      ? "text-zinc-400 dark:text-zinc-500"
      : pending > 0.005
        ? "text-emerald-500"
        : pending < -0.005
          ? "text-red-400"
          : "text-zinc-400 dark:text-zinc-500";

  const pendingLabel =
    !ratesReady
      ? "···"
      : pending > 0.005
        ? `+${sym(displayCurrency)}${fmtAmount(pending, displayCurrency)}`
        : pending < -0.005
          ? `-${sym(displayCurrency)}${fmtAmount(Math.abs(pending), displayCurrency)}`
          : "Saldado";

  const pendingSubLabel =
    pending > 0.005
      ? "Te deben"
      : pending < -0.005
        ? "Debes"
        : "Sin deudas";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white dark:bg-[#18191c] dark:border-[#3f3f46] p-5">
      <p className="text-[10px] font-bold uppercase tracking-[.07em] text-zinc-500 mb-4">
        Resumen · {activeCount} gasto{activeCount !== 1 ? "s" : ""} · {participantCount} participante{participantCount !== 1 ? "s" : ""}
      </p>
      <div className="divide-y divide-zinc-100 dark:divide-[#2d2d31]">
        {/* Total gastado */}
        <div className="pb-3">
          <p className="text-[10px] font-bold uppercase tracking-[.07em] text-zinc-400 dark:text-zinc-500 mb-0.5">
            Total gastado
          </p>
          {ratesReady ? (
            <p className="text-[22px] font-black tracking-tight dark:text-zinc-100">
              {sym(displayCurrency)}{fmtAmount(total, displayCurrency)}
            </p>
          ) : (
            <p className="text-[22px] font-black tracking-tight text-zinc-300 dark:text-zinc-600">···</p>
          )}
        </div>

        {/* Mi parte */}
        <div className="py-3">
          <p className="text-[10px] font-bold uppercase tracking-[.07em] text-zinc-400 dark:text-zinc-500 mb-0.5">
            Mi parte
          </p>
          {ratesReady ? (
            <p className="text-[22px] font-black tracking-tight dark:text-zinc-100">
              {sym(displayCurrency)}{fmtAmount(myShare, displayCurrency)}
            </p>
          ) : (
            <p className="text-[22px] font-black tracking-tight text-zinc-300 dark:text-zinc-600">···</p>
          )}
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
            De {participantCount} participante{participantCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Me deben / Debo */}
        <div className="pt-3">
          <p className="text-[10px] font-bold uppercase tracking-[.07em] text-zinc-400 dark:text-zinc-500 mb-0.5">
            {pendingSubLabel}
          </p>
          <p className={`text-[22px] font-black tracking-tight ${pendingColor}`}>
            {pendingLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
