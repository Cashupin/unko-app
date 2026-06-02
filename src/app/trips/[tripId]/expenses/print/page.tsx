import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calculateSettlement } from "@/modules/expenses/lib/settlement";
import { CURRENCY_SYMBOLS, fmtAmount } from "@/lib/constants";
import type { Currency } from "@/lib/constants";
import { PrintButton } from "./print-button";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sym(c: string) { return CURRENCY_SYMBOLS[c as Currency] ?? c; }
function fmt(amount: number, currency: string) { return sym(currency) + fmtAmount(amount, currency); }
function toStr(d: Date) { return d.toISOString().slice(0, 10); }
function fmtDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
}

const CATEGORY_LABELS: Record<string, string> = {
  ACCOMMODATION: "Alojamiento",
  FOOD: "Comida",
  TRANSPORT: "Transporte",
  ACTIVITIES: "Actividades",
  SHOPPING: "Compras",
  HEALTH: "Salud",
  OTHER: "Otro",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ExpensesPrintPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const { tripId } = await params;

  const [trip, myParticipant] = await Promise.all([
    prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true, name: true, destination: true, startDate: true, endDate: true, defaultCurrency: true },
    }),
    prisma.tripParticipant.findFirst({
      where: { tripId, userId: session.user.id },
      select: { id: true },
    }),
  ]);

  if (!trip) notFound();
  if (!myParticipant) redirect("/");

  const [rawParticipants, rawExpenses, rawPayments] = await Promise.all([
    prisma.tripParticipant.findMany({
      where: { tripId },
      select: { id: true, name: true },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.expense.findMany({
      where: { tripId, isActive: true },
      select: {
        id: true,
        description: true,
        amount: true,
        currency: true,
        expenseDate: true,
        category: true,
        paidBy: { select: { id: true, name: true } },
        participants: {
          select: {
            participantId: true,
            amount: true,
            paid: true,
            participant: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { expenseDate: "asc" },
    }),
    prisma.payment.findMany({
      where: { tripId },
      select: {
        id: true,
        amount: true,
        currency: true,
        paidAt: true,
        fromParticipant: { select: { id: true, name: true } },
        toParticipant: { select: { id: true, name: true } },
      },
      orderBy: { paidAt: "asc" },
    }),
  ]);

  const participants = rawParticipants.map((p) => ({ id: p.id, name: p.name }));
  const currency = trip.defaultCurrency as string;

  // ── Settlement inputs ────────────────────────────────────────────────────────

  const expensesForSettlement = rawExpenses.map((e) => ({
    id: e.id,
    amount: e.amount,
    currency: e.currency,
    paidByParticipantId: e.paidBy?.id ?? null,
    participants: e.participants.map((ep) => ({ participantId: ep.participantId, amount: ep.amount })),
  }));

  const paymentsForSettlement = rawPayments.map((p) => ({
    id: p.id,
    fromParticipantId: p.fromParticipant.id,
    toParticipantId: p.toParticipant.id,
    amount: p.amount,
    currency: p.currency,
  }));

  const paidSplitPayments = rawExpenses
    .filter((e) => e.paidBy)
    .flatMap((e) =>
      e.participants
        .filter((ep) => ep.paid && ep.participantId !== e.paidBy!.id)
        .map((ep) => ({
          id: `split-${e.id}-${ep.participantId}`,
          fromParticipantId: ep.participantId,
          toParticipantId: e.paidBy!.id,
          amount: ep.amount,
          currency: e.currency,
        })),
    );

  // Raw balances = no payments applied (explains gross position)
  const { balances: rawBals } = calculateSettlement(expensesForSettlement, participants, []);
  // Adjusted balances = with all payments (current state)
  const { balances: adjBals, settlements } = calculateSettlement(
    expensesForSettlement,
    participants,
    [...paymentsForSettlement, ...paidSplitPayments],
  );

  const rawBalList = rawBals[currency] ?? [];
  const adjBalList = adjBals[currency] ?? [];

  // Build per-participant lookup for adjusted balance
  const adjBalMap = new Map(adjBalList.map((b) => [b.participantId, b]));

  // Total paid across all splits (marked-paid)
  const paidSplitByPerson = new Map<string, number>();
  for (const sp of paidSplitPayments) {
    paidSplitByPerson.set(sp.fromParticipantId, (paidSplitByPerson.get(sp.fromParticipantId) ?? 0) + sp.amount);
  }
  const registeredPayByPerson = new Map<string, number>();
  for (const rp of paymentsForSettlement) {
    registeredPayByPerson.set(rp.fromParticipantId, (registeredPayByPerson.get(rp.fromParticipantId) ?? 0) + rp.amount);
  }

  const totalExpenses = rawExpenses.reduce((s, e) => s + e.amount, 0);
  const allSettled = settlements.length === 0;

  const tripStart = trip.startDate ? toStr(trip.startDate) : null;
  const tripEnd   = trip.endDate   ? toStr(trip.endDate)   : null;

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
          .print-break { page-break-before: always; }
          .no-print { display: none !important; }
        }
      `}</style>

      <PrintButton />

      <div className="mx-auto max-w-4xl bg-white px-8 py-10 text-zinc-900 print:p-0">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="mb-8 border-b border-zinc-200 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Liquidación de gastos</p>
              <h1 className="mt-1 text-3xl font-bold text-zinc-900">{trip.name}</h1>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-500">
                {trip.destination && <span>📍 {trip.destination}</span>}
                {tripStart && tripEnd && <span>📅 {fmtDate(tripStart)} – {fmtDate(tripEnd)}</span>}
                <span>👥 {participants.length} participantes</span>
              </div>
            </div>
            <p className="shrink-0 text-right text-xs text-zinc-400">
              Generado el {new Date().toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* ── Sección 1: Resumen ──────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold uppercase tracking-wider text-zinc-400">
            1. Resumen
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-200 p-4 text-center">
              <p className="text-xs font-semibold uppercase text-zinc-400">Total gastado</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{fmt(totalExpenses, currency)}</p>
              <p className="mt-0.5 text-xs text-zinc-400">{rawExpenses.length} gasto{rawExpenses.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-4 text-center">
              <p className="text-xs font-semibold uppercase text-zinc-400">Participantes</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{participants.length}</p>
              <p className="mt-0.5 text-xs text-zinc-400">{participants.map((p) => p.name.split(" ")[0]).join(", ")}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-4 text-center">
              <p className="text-xs font-semibold uppercase text-zinc-400">Estado</p>
              <p className={`mt-1 text-2xl font-bold ${allSettled ? "text-emerald-600" : "text-amber-600"}`}>
                {allSettled ? "✓ Al día" : `${settlements.length} pendiente${settlements.length !== 1 ? "s" : ""}`}
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">{allSettled ? "Sin transferencias" : "Ver sección 3"}</p>
            </div>
          </div>
        </section>

        {/* ── Sección 2: Balances ─────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-1 text-lg font-bold uppercase tracking-wider text-zinc-400">
            2. Balance por participante
          </h2>
          <p className="mb-4 text-sm text-zinc-500">
            El balance neto de cada persona es la diferencia entre lo que pagó adelantado y lo que le corresponde gastar.
            Quien tiene balance positivo es <strong>acreedor</strong> (le deben dinero); quien tiene balance negativo es <strong>deudor</strong> (debe dinero).
          </p>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-200">
                <th className="py-2 text-left font-semibold text-zinc-600">Participante</th>
                <th className="py-2 text-right font-semibold text-zinc-600">Pagó adelantado</th>
                <th className="py-2 text-right font-semibold text-zinc-600">Le corresponde</th>
                <th className="py-2 text-right font-semibold text-zinc-600">Balance bruto</th>
                <th className="py-2 text-right font-semibold text-zinc-600">Ya saldado</th>
                <th className="py-2 text-right font-semibold text-zinc-600">Pendiente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rawBalList.map((rb) => {
                const adj = adjBalMap.get(rb.participantId);
                const paidSplits = paidSplitByPerson.get(rb.participantId) ?? 0;
                const paidRegistered = registeredPayByPerson.get(rb.participantId) ?? 0;
                const totalAlreadyPaid = paidSplits + paidRegistered;
                const pendingBalance = adj?.balance ?? rb.balance;
                const isCreditor = rb.balance > 0.005;
                const isDebtor = rb.balance < -0.005;
                const isSettledNow = Math.abs(pendingBalance) < 0.005;

                return (
                  <tr key={rb.participantId} className="hover:bg-zinc-50">
                    <td className="py-2.5 font-semibold text-zinc-800">{rb.name}</td>
                    <td className="py-2.5 text-right tabular-nums text-zinc-700">
                      {rb.paid > 0 ? fmt(rb.paid, currency) : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-zinc-700">
                      {fmt(rb.owes, currency)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-bold">
                      <span className={isCreditor ? "text-emerald-600" : isDebtor ? "text-red-600" : "text-zinc-400"}>
                        {isCreditor ? "+" : ""}{fmt(rb.balance, currency)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-zinc-500">
                      {totalAlreadyPaid > 0.005 ? fmt(totalAlreadyPaid, currency) : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-bold">
                      {isSettledNow ? (
                        <span className="text-emerald-600">✓ Saldado</span>
                      ) : pendingBalance < -0.005 ? (
                        <span className="text-amber-600">{fmt(Math.abs(pendingBalance), currency)}</span>
                      ) : (
                        <span className="text-emerald-600">+{fmt(pendingBalance, currency)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-zinc-200">
                <td className="py-2.5 font-bold text-zinc-800">Total</td>
                <td className="py-2.5 text-right tabular-nums font-bold text-zinc-800">
                  {fmt(rawBalList.reduce((s, b) => s + b.paid, 0), currency)}
                </td>
                <td className="py-2.5 text-right tabular-nums font-bold text-zinc-800">
                  {fmt(rawBalList.reduce((s, b) => s + b.owes, 0), currency)}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>

          {/* Per-person explanation */}
          <div className="mt-5 flex flex-col gap-3">
            {rawBalList.map((rb) => {
              const adj = adjBalMap.get(rb.participantId);
              const pendingBalance = adj?.balance ?? rb.balance;
              const isCreditor = rb.balance > 0.005;
              const isSettledNow = Math.abs(pendingBalance) < 0.005;
              const myTransfers = settlements.filter((s) => s.fromId === rb.participantId);

              let explanation = "";
              if (isCreditor) {
                explanation = `${rb.name} pagó ${fmt(rb.paid, currency)} en total, pero su parte proporcional es ${fmt(rb.owes, currency)}. Pagó ${fmt(rb.balance, currency)} de más, por lo que los demás le deben ese dinero. No le corresponde hacer ninguna transferencia.`;
              } else if (rb.balance < -0.005) {
                if (isSettledNow) {
                  explanation = `${rb.name} debía ${fmt(Math.abs(rb.balance), currency)} pero ya lo saldó (mediante pagos registrados o gastos marcados como pagados).`;
                } else {
                  const transfersText = myTransfers.map((t) => `${fmt(t.amount, t.currency)} a ${t.toName}`).join(" y ");
                  explanation = `${rb.name} no pagó ningún gasto directamente pero su parte suman ${fmt(rb.owes, currency)}. Debe transferir ${transfersText}.`;
                }
              } else {
                explanation = `${rb.name} está exactamente al día — pagó exactamente lo que le correspondía.`;
              }

              return (
                <div key={rb.participantId} className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                  {explanation}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Sección 3: Liquidación óptima ──────────────────────────────────── */}
        <section className="print-break mb-10">
          <h2 className="mb-1 text-lg font-bold uppercase tracking-wider text-zinc-400">
            3. Liquidación óptima
          </h2>
          <p className="mb-4 text-sm text-zinc-500">
            El sistema calcula el <strong>mínimo número de transferencias</strong> para saldar todas las deudas.
            Esto significa que no siempre existe un pago directo entre cada par de personas — las deudas se pueden
            "enrutar" de forma más eficiente. Por ejemplo, si A debe a B y B debe a C, es mejor que A le pague
            directamente a C.
          </p>

          {allSettled ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
              <p className="text-2xl">🎉</p>
              <p className="mt-2 font-semibold text-emerald-700">¡Todos los participantes están al día!</p>
              <p className="mt-1 text-sm text-emerald-600">No hay transferencias pendientes.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {settlements.map((s, i) => {
                const fromRaw = rawBalList.find((b) => b.participantId === s.fromId);
                const toRaw = rawBalList.find((b) => b.participantId === s.toId);
                return (
                  <div key={i} className="overflow-hidden rounded-xl border border-zinc-200">
                    {/* Transfer row */}
                    <div className="flex items-center gap-4 bg-amber-50 px-5 py-3">
                      <div className="flex flex-1 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                          {s.fromName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                        </span>
                        <div>
                          <p className="font-bold text-zinc-900">{s.fromName}</p>
                          <p className="text-xs text-zinc-500">Deudor</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-lg font-bold text-amber-600">{fmt(s.amount, s.currency)}</span>
                        <span className="text-xs text-zinc-400">→</span>
                      </div>
                      <div className="flex flex-1 items-center justify-end gap-3">
                        <div className="text-right">
                          <p className="font-bold text-zinc-900">{s.toName}</p>
                          <p className="text-xs text-zinc-500">Acreedor</p>
                        </div>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                          {s.toName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {/* Explanation */}
                    <div className="px-5 py-3 text-xs text-zinc-500">
                      {fromRaw && toRaw && (
                        <>
                          <strong>{s.fromName}</strong> tiene un balance bruto de{" "}
                          <span className="font-semibold text-red-600">{fmt(Math.abs(fromRaw.balance), currency)}</span>{" "}
                          negativo (debe dinero).{" "}
                          <strong>{s.toName}</strong> tiene un balance de{" "}
                          <span className="font-semibold text-emerald-600">+{fmt(toRaw.balance, currency)}</span>{" "}
                          positivo (le deben dinero). El algoritmo los empareja para minimizar transferencias.
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* "Why not X to Y" table */}
          {rawBalList.some((b) => b.balance > 0.005) && (
            <div className="mt-5 rounded-xl border border-zinc-200 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">
                ¿Por qué no hay transferencias entre ciertas personas?
              </p>
              <div className="flex flex-col gap-2 text-sm text-zinc-600">
                {rawBalList.filter((b) => b.balance > 0.005).map((creditor) => (
                  <p key={creditor.participantId}>
                    • <strong>{creditor.name}</strong> no le debe a nadie porque tiene balance{" "}
                    <strong className="text-emerald-700">positivo (+{fmt(creditor.balance, currency)})</strong>:{" "}
                    pagó más de lo que le correspondía. Los acreedores reciben, no envían.
                  </p>
                ))}
                {rawBalList.filter((b) => Math.abs(b.balance) < 0.005).map((neutral) => (
                  <p key={neutral.participantId}>
                    • <strong>{neutral.name}</strong> tiene balance cero — pagó exactamente su parte, no debe ni le deben.
                  </p>
                ))}
                {rawBalList.filter((b) => b.balance < -0.005).length > 1 && (
                  <p>
                    • Cuando hay varios deudores, el algoritmo empareja cada uno con el acreedor que más le
                    conviene para minimizar el total de transferencias. No siempre es una relación directa entre pares.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── Sección 4: Detalle por gasto ────────────────────────────────────── */}
        <section className="print-break mb-10">
          <h2 className="mb-4 text-lg font-bold uppercase tracking-wider text-zinc-400">
            4. Detalle por gasto
          </h2>
          <div className="flex flex-col gap-4">
            {rawExpenses.map((e) => {
              const date = e.expenseDate ? toStr(e.expenseDate) : null;
              const category = e.category ? (CATEGORY_LABELS[e.category] ?? e.category) : null;
              const allPaid = e.participants.every((ep) => ep.paid || ep.participantId === e.paidBy?.id);
              return (
                <div key={e.id} className="break-inside-avoid overflow-hidden rounded-xl border border-zinc-200">
                  {/* Expense header */}
                  <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-zinc-900">{e.description}</p>
                      {category && (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                          {category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {date && <span className="text-xs text-zinc-400">{fmtDate(date)}</span>}
                      <span className="font-bold text-zinc-900">{fmt(e.amount, e.currency)}</span>
                      {allPaid && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          ✓ Saldado
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Splits table */}
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-zinc-100">
                      {e.participants.map((ep) => {
                        const isPayer = ep.participantId === e.paidBy?.id;
                        return (
                          <tr key={ep.participantId} className={isPayer ? "bg-emerald-50/50" : ""}>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                {isPayer && (
                                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                    Pagó
                                  </span>
                                )}
                                <span className={isPayer ? "font-semibold text-zinc-800" : "text-zinc-600"}>
                                  {ep.participant.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-zinc-700">
                              {fmt(ep.amount, e.currency)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {isPayer ? (
                                <span className="text-xs text-zinc-400">—</span>
                              ) : ep.paid ? (
                                <span className="text-xs font-semibold text-emerald-600">✓ Marcado pagado</span>
                              ) : (
                                <span className="text-xs text-amber-600">Pendiente</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Sección 5: Pagos registrados ────────────────────────────────────── */}
        {rawPayments.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-bold uppercase tracking-wider text-zinc-400">
              5. Pagos registrados
            </h2>
            <p className="mb-3 text-sm text-zinc-500">
              Estos pagos ya fueron aplicados al cálculo de la liquidación óptima (sección 3).
            </p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-zinc-200">
                  <th className="py-2 text-left font-semibold text-zinc-600">De</th>
                  <th className="py-2 text-left font-semibold text-zinc-600">A</th>
                  <th className="py-2 text-right font-semibold text-zinc-600">Monto</th>
                  <th className="py-2 text-right font-semibold text-zinc-600">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rawPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 font-semibold text-zinc-800">{p.fromParticipant.name}</td>
                    <td className="py-2 text-zinc-600">{p.toParticipant.name}</td>
                    <td className="py-2 text-right tabular-nums font-semibold text-emerald-600">
                      {fmt(p.amount, p.currency)}
                    </td>
                    <td className="py-2 text-right text-zinc-400">
                      {fmtDate(toStr(p.paidAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Footer */}
        <div className="border-t border-zinc-100 pt-4 text-center text-xs text-zinc-300">
          Liquidación generada con UnkoTrip · {new Date().toLocaleDateString("es-CL")}
        </div>
      </div>
    </>
  );
}
