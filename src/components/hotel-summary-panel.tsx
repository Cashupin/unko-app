"use client";

import { useState } from "react";
import { useCurrency } from "@/components/currency-provider";
import { CURRENCY_SYMBOLS, CURRENCY_DECIMALS } from "@/lib/constants";
import type { Currency } from "@/lib/constants";

type HotelItem = {
  pricePerNight: number | null;
  totalPrice: number | null;
  numberOfNights: number;
  currency: string;
};

type Props = {
  hotels: HotelItem[];
  participantCount: number;
};

export function HotelSummaryPanel({ hotels, participantCount }: Props) {
  const [open, setOpen] = useState(false);
  const { displayCurrency, convert, exchangeRates } = useCurrency();

  const ready = exchangeRates.status === "ready";

  const symbol = CURRENCY_SYMBOLS[displayCurrency as Currency] ?? displayCurrency;
  const decimals = CURRENCY_DECIMALS[displayCurrency as Currency] ?? 0;
  const fmt = (n: number) =>
    `${symbol}${n.toLocaleString("es-CL", { maximumFractionDigits: decimals, minimumFractionDigits: 0 })}`;

  // Convert each hotel's amounts to displayCurrency before summing
  const totalSum = hotels.reduce((acc, h) => {
    if (h.totalPrice == null) return acc;
    return acc + (ready ? convert(h.totalPrice, h.currency) : h.totalPrice);
  }, 0);

  const totalNights = hotels.reduce((acc, h) => acc + h.numberOfNights, 0);

  const hotelsWithPrice = hotels.filter((h) => h.pricePerNight != null);
  const avgPricePerNight =
    hotelsWithPrice.length > 0
      ? hotelsWithPrice.reduce((acc, h) => {
          const converted = ready ? convert(h.pricePerNight!, h.currency) : h.pricePerNight!;
          return acc + converted;
        }, 0) / hotelsWithPrice.length
      : null;

  const totalPerParticipant = participantCount > 0 ? totalSum / participantCount : null;
  const totalPerParticipantPerNight =
    totalPerParticipant != null && totalNights > 0
      ? totalPerParticipant / totalNights
      : null;

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm ring-1 ring-black/3 dark:border-zinc-700 dark:bg-zinc-800 dark:ring-white/5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">💰</span>
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Resumen de costos
          </span>
        </div>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {open ? "▲ Ocultar" : "▼ Ver resumen"}
        </span>
      </button>

      {open && (
        <>
          <div className="mx-5 h-px bg-zinc-100 dark:bg-zinc-700" />
          <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
            {avgPricePerNight != null && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Promedio / noche
                </p>
                <p className="mt-0.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {fmt(avgPricePerNight)}
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Total alojamientos
              </p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {fmt(totalSum)}
              </p>
            </div>
            {totalPerParticipant != null && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Total / persona
                </p>
                <p className="mt-0.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {fmt(totalPerParticipant)}
                </p>
              </div>
            )}
            {totalPerParticipantPerNight != null && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Total / persona / noche
                </p>
                <p className="mt-0.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {fmt(totalPerParticipantPerNight)}
                </p>
              </div>
            )}
          </div>
          {!ready && (
            <div className="px-5 pb-3">
              <p className="text-[10px] text-zinc-400 dark:text-zinc-600">
                Cargando tasas de cambio...
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
