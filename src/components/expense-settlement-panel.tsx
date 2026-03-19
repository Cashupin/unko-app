"use client";

import { useState } from "react";
import { CreatePaymentForm } from "@/components/create-payment-form";
import { ConvertedAmount } from "@/components/converted-amount";

type Settlement = {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  amount: number;
  currency: string;
};

type Participant = { id: string; name: string };

type Props = {
  settlements: Settlement[];
  isAdmin: boolean;
  tripId: string;
  participants: Participant[];
  defaultCurrency: string;
};

export function ExpenseSettlementPanel({
  settlements,
  isAdmin,
  tripId,
  participants,
  defaultCurrency,
}: Props) {
  const [open, setOpen] = useState(false);

  // Group by fromId
  const groups = Array.from(
    settlements.reduce((map, s) => {
      if (!map.has(s.fromId)) map.set(s.fromId, { name: s.fromName, items: [] });
      map.get(s.fromId)!.items.push(s);
      return map;
    }, new Map<string, { name: string; items: Settlement[] }>()),
  );

  return (
    <div className="rounded-2xl border border-zinc-100 dark:border-[#2d2d31] bg-white dark:bg-[#1f2023] overflow-hidden">
      {/* Trigger header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <span className="text-[10px] font-bold uppercase tracking-[.07em] text-zinc-400 dark:text-zinc-500">
          Liquidación general
        </span>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <span
              onClick={(e) => e.stopPropagation()}
              className="flex"
            >
              <CreatePaymentForm
                tripId={tripId}
                participants={participants}
                defaultCurrency={defaultCurrency}
              />
            </span>
          )}
          <span
            className={`text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="border-t border-zinc-100 dark:border-[#2d2d31]">
          {settlements.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-400">
              ¡Todo al día! No hay transferencias pendientes.
            </p>
          ) : (
            <div>
              {groups.map(([fromId, group]) => (
                <div key={fromId}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase text-zinc-400 dark:text-zinc-500">
                    {group.name} debe
                  </p>
                  <div className="divide-y divide-zinc-100 dark:divide-[#2d2d31]">
                    {group.items.map((s, i) => (
                      <div
                        key={i}
                        className="mx-3 mb-3 flex items-center justify-between bg-zinc-50 dark:bg-[#27272a] border border-zinc-100 dark:border-[#3f3f46] rounded-xl px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2 text-sm min-w-0">
                          <span className="text-zinc-400 shrink-0">→</span>
                          <span className="font-bold dark:text-zinc-100 truncate">{s.toName}</span>
                        </div>
                        <span className="shrink-0 text-sm font-bold dark:text-zinc-100">
                          <ConvertedAmount amount={s.amount} currency={s.currency} />
                        </span>
                      </div>
                    ))}
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
