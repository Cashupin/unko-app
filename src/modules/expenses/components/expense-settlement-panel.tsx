"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CreatePaymentForm } from "@/modules/expenses/components/create-payment-form";
import { ConvertedAmount } from "@/components/ui/converted-amount";
import { CURRENCY_SYMBOLS, fmtAmount } from "@/lib/constants";
import type { Currency } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

type Settlement = {
  fromId: string; toId: string;
  fromName: string; toName: string;
  amount: number; currency: string;
};

type Participant = { id: string; name: string };

export type SplitBreakdown = {
  expenseId: string;
  description: string;
  share: number;
  currency: string;
  paidByName: string;
  isPaid: boolean;
};

export type PaymentGiven = {
  id: string;
  amount: number;
  currency: string;
  toName: string;
  paidAt: string;
};

export type ParticipantBreakdown = {
  id: string;
  name: string;
  splits: SplitBreakdown[];
  paymentsGiven: PaymentGiven[];
};

type Props = {
  settlements: Settlement[];
  isAdmin: boolean;
  tripId: string;
  participants: Participant[];
  defaultCurrency: string;
  participantBreakdowns: ParticipantBreakdown[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function sym(c: string): string {
  return CURRENCY_SYMBOLS[c as Currency] ?? c;
}

function fmt(amount: number, currency: string): string {
  return sym(currency) + fmtAmount(amount, currency);
}

// ─── Breakdown Modal ──────────────────────────────────────────────────────────

function BreakdownModal({
  onClose,
  participantBreakdowns,
  settlements,
  defaultCurrency,
  tripId,
}: {
  onClose: () => void;
  participantBreakdowns: ParticipantBreakdown[];
  settlements: Settlement[];
  defaultCurrency: string;
  tripId: string;
}) {
  const debtors = participantBreakdowns.filter((pb) => pb.splits.length > 0);

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75" />
      <div
        className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[#27272a] bg-[#0f1419] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-[#27272a] bg-[#0f1419] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Desglose de liquidación</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Cómo se calcula lo que debe cada participante
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/trips/${tripId}/expenses/print`}
              target="_blank"
              className="flex items-center gap-1.5 rounded-lg border border-[#27272a] bg-[#18191c]/60 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-[#27272a] hover:text-zinc-200"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar PDF
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-[#27272a] hover:text-zinc-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {debtors.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mb-2 text-3xl">🎉</div>
              <p className="text-sm text-zinc-400">Todos los participantes están al día.</p>
            </div>
          ) : (
            debtors.map((pb) => {
              const totalOwed = pb.splits.reduce((s, x) => s + x.share, 0);
              const markedPaid = pb.splits.filter((s) => s.isPaid).reduce((s, x) => s + x.share, 0);
              const explicitPaid = pb.paymentsGiven.reduce((s, x) => s + x.amount, 0);
              const pending = totalOwed - markedPaid - explicitPaid;
              const myTransfers = settlements.filter((s) => s.fromId === pb.id);
              const isSettled = myTransfers.length === 0;

              return (
                <div
                  key={pb.id}
                  className="overflow-hidden rounded-xl border border-[#27272a] bg-[#18191c]/60"
                >
                  {/* Person header */}
                  <div className="flex items-center justify-between border-b border-[#27272a] px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-200">
                        {initials(pb.name)}
                      </div>
                      <span className="font-semibold text-zinc-100">{pb.name}</span>
                    </div>
                    {isSettled ? (
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                        ✓ Al día
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
                        Pendiente
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 p-4">
                    {/* Expense splits */}
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Participa en
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {pb.splits.map((s) => (
                          <div
                            key={s.expenseId}
                            className={`flex items-center justify-between rounded-lg border border-[#27272a] bg-[#0f1419] px-3 py-2 ${s.isPaid ? "opacity-50" : ""}`}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              {s.isPaid && (
                                <svg className="h-3 w-3 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              <span className={`truncate text-sm text-zinc-300 ${s.isPaid ? "line-through" : ""}`}>
                                {s.description}
                              </span>
                              <span className="shrink-0 text-xs text-zinc-600">· pagó {s.paidByName}</span>
                            </div>
                            <span className={`ml-3 shrink-0 tabular-nums text-sm font-semibold ${s.isPaid ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                              {fmt(s.share, s.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Explicit payments given */}
                    {pb.paymentsGiven.length > 0 && (
                      <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          Pagos registrados
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {pb.paymentsGiven.map((pay) => (
                            <div
                              key={pay.id}
                              className="flex items-center justify-between rounded-lg border border-emerald-700/30 bg-emerald-900/20 px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-emerald-500">→</span>
                                <span className="text-sm text-zinc-300">{pay.toName}</span>
                                <span className="text-xs text-zinc-600">
                                  · {new Date(pay.paidAt).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                                </span>
                              </div>
                              <span className="tabular-nums text-sm font-semibold text-emerald-400">
                                −{fmt(pay.amount, pay.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Balance summary */}
                    <div className="flex flex-wrap gap-4 rounded-lg border border-[#27272a] bg-[#0f1419] px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Total adeudado</span>
                        <span className="tabular-nums text-sm font-bold text-zinc-200">
                          {fmt(totalOwed, defaultCurrency)}
                        </span>
                      </div>
                      {(markedPaid + explicitPaid) > 0 && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Ya pagado</span>
                          <span className="tabular-nums text-sm font-bold text-emerald-400">
                            −{fmt(markedPaid + explicitPaid, defaultCurrency)}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Pendiente</span>
                        <span className={`tabular-nums text-sm font-bold ${isSettled ? "text-emerald-400" : "text-amber-400"}`}>
                          {isSettled ? "✓ Saldado" : fmt(Math.max(0, pending), defaultCurrency)}
                        </span>
                      </div>
                    </div>

                    {/* Pending transfers */}
                    {myTransfers.length > 0 && (
                      <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          Debe transferir
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {myTransfers.map((t, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between rounded-lg border border-amber-700/30 bg-amber-900/20 px-3 py-2.5"
                            >
                              <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-zinc-200">
                                  {initials(t.toName)}
                                </div>
                                <span className="text-sm font-semibold text-zinc-200">{t.toName}</span>
                              </div>
                              <span className="tabular-nums text-sm font-bold text-amber-400">
                                {fmt(t.amount, t.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ExpenseSettlementPanel({
  settlements,
  isAdmin,
  tripId,
  participants,
  defaultCurrency,
  participantBreakdowns,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const groups = Array.from(
    settlements.reduce((map, s) => {
      if (!map.has(s.fromId)) map.set(s.fromId, { name: s.fromName, items: [] });
      map.get(s.fromId)!.items.push(s);
      return map;
    }, new Map<string, { name: string; items: Settlement[] }>()),
  );

  const allSettled = settlements.length === 0;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white dark:border-[#2d2d31] dark:bg-[#1f2023]">
        {/* Header — solo label + badge + flecha */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => e.key === "Enter" && setOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[.07em] text-zinc-400 dark:text-zinc-500">
              Liquidación general
            </span>
            {allSettled ? (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                ✓ Al día
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                {settlements.length} pendiente{settlements.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <span className={`text-zinc-400 transition-transform duration-200 dark:text-zinc-500 ${open ? "rotate-180" : ""}`}>
            ▾
          </span>
        </div>

        {/* Body */}
        {open && (
          <div className="border-t border-zinc-100 dark:border-[#2d2d31]">
            {allSettled ? (
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="text-emerald-500">✓</span>
                <span className="text-sm text-zinc-400">¡Todo al día! No hay transferencias pendientes.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 p-3">
                {groups.map(([fromId, group]) => (
                  <div key={fromId} className="overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50/60 dark:border-[#27272a] dark:bg-[#18191c]/60">
                    {/* Debtor row */}
                    <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 dark:border-[#27272a]">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
                        {initials(group.name)}
                      </div>
                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {group.name} debe
                      </span>
                    </div>
                    {/* Transfers */}
                    <div className="divide-y divide-zinc-100 dark:divide-[#27272a]">
                      {group.items.map((s, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="shrink-0 text-xs text-zinc-400">→</span>
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
                              {initials(s.toName)}
                            </div>
                            <span className="truncate text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                              {s.toName}
                            </span>
                          </div>
                          <span className="ml-2 shrink-0 tabular-nums text-sm font-bold text-zinc-800 dark:text-zinc-100">
                            <ConvertedAmount amount={s.amount} currency={s.currency} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer con acciones */}
            <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2.5 dark:border-[#2d2d31]">
              <button
                type="button"
                onClick={() => setShowBreakdown(true)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-[#27272a] dark:hover:text-zinc-200"
              >
                Ver desglose →
              </button>
              {isAdmin && (
                <CreatePaymentForm
                  tripId={tripId}
                  participants={participants}
                  defaultCurrency={defaultCurrency}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {showBreakdown && (
        <BreakdownModal
          onClose={() => setShowBreakdown(false)}
          participantBreakdowns={participantBreakdowns}
          settlements={settlements}
          defaultCurrency={defaultCurrency}
          tripId={tripId}
        />
      )}
    </>
  );
}
