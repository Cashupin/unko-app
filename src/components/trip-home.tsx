import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calculateSettlement } from "@/lib/settlement";
import { MySettlementBanner } from "@/components/my-settlement-banner";
import { getMapsUrl } from "@/lib/maps-url";
import { NearbyActivities } from "@/components/nearby-activities";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function parseDateHeader(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    dayNum: d,
    weekday: date.toLocaleDateString("es-CL", { weekday: "long" }),
    monthYear: date.toLocaleDateString("es-CL", { month: "long", year: "numeric" }),
    full: date.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }),
  };
}

/** Compute the 2 days to preview */
function getPreviewDays(startDate: Date | null, endDate: Date | null): [string | null, string | null] {
  if (!startDate) return [null, null];

  const startStr = toDateStr(startDate);
  const endStr = endDate ? toDateStr(endDate) : null;
  const todayStr = toDateStr(new Date());

  let day1: string;
  if (endStr && todayStr >= startStr && todayStr <= endStr) {
    day1 = todayStr;
  } else {
    day1 = startStr;
  }

  const day2Raw = addDays(day1, 1);
  const day2 = !endStr || day2Raw <= endStr ? day2Raw : null;

  return [day1, day2];
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type Participant = { id: string; name: string };

// ─── Main component ────────────────────────────────────────────────────────────

export async function TripHome({
  tripId,
  tripStartDate,
  tripEndDate,
  myParticipantId,
  participants,
  defaultCurrency,
}: {
  tripId: string;
  tripStartDate: Date | null;
  tripEndDate: Date | null;
  myParticipantId: string;
  participants: Participant[];
  defaultCurrency: string;
}) {
  const [day1, day2] = getPreviewDays(tripStartDate, tripEndDate);

  const activityDates = [day1, day2].filter(Boolean) as string[];

  const [activities, hotels, items, rawExpenses, rawPayments] = await Promise.all([
    // Activities for the 2 preview days
    activityDates.length > 0
      ? prisma.activity.findMany({
          where: {
            tripId,
            activityDate: {
              gte: new Date(activityDates[0] + "T00:00:00Z"),
              lte: new Date(activityDates[activityDates.length - 1] + "T23:59:59Z"),
            },
          },
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            locationLat: true,
            locationLng: true,
            activityDate: true,
            activityTime: true,
          },
          orderBy: [{ activityDate: "asc" }, { activityTime: "asc" }],
        })
      : Promise.resolve([] as { id: string; title: string; description: string | null; location: string | null; locationLat: number | null; locationLng: number | null; activityDate: Date | null; activityTime: string | null }[]),

    // Hotels (for badge in day cards)
    prisma.hotel.findMany({
      where: { tripId },
      select: { id: true, name: true, checkInDate: true, checkOutDate: true },
    }),

    // First 10 proposals
    prisma.item.findMany({
      where: { tripId },
      select: { id: true, title: true, type: true, status: true, location: true, locationLat: true, locationLng: true },
      orderBy: { createdAt: "asc" },
      take: 10,
    }),

    // Expenses for settlement (active only)
    prisma.expense.findMany({
      where: { tripId, isActive: true },
      select: {
        id: true,
        amount: true,
        currency: true,
        paidBy: { select: { id: true } },
        participants: { select: { participantId: true, amount: true, paid: true, participant: { select: { id: true } } } },
      },
    }),

    // Payments for settlement
    prisma.payment.findMany({
      where: { tripId },
      select: {
        id: true,
        amount: true,
        currency: true,
        fromParticipant: { select: { id: true } },
        toParticipant: { select: { id: true } },
      },
    }),
  ]);

  // Build settlement
  const expensesForSettlement = rawExpenses.map((e) => ({
    id: e.id,
    amount: e.amount,
    currency: e.currency,
    paidByParticipantId: e.paidBy?.id ?? null,
    participants: e.participants.map((ep) => ({
      participantId: ep.participant.id,
      amount: ep.amount,
    })),
  }));

  const paymentsForSettlement = rawPayments.map((p) => ({
    id: p.id,
    fromParticipantId: p.fromParticipant.id,
    toParticipantId: p.toParticipant.id,
    amount: p.amount,
    currency: p.currency,
  }));

  // Paid splits count as implicit payments from debtor → payer
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

  const { settlements } = calculateSettlement(
    expensesForSettlement,
    participants,
    [...paymentsForSettlement, ...paidSplitPayments],
  );

  const mySettlements = settlements.filter(
    (s) => s.fromId === myParticipantId || s.toId === myParticipantId,
  );

  // Group activities by date
  const byDate = new Map<string, typeof activities>();
  for (const act of activities) {
    if (!act.activityDate) continue;
    const key = toDateStr(new Date(act.activityDate));
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(act);
  }

  // Hotels for a given day
  function hotelsForDay(dateStr: string) {
    return hotels.filter((h) => {
      const ci = toDateStr(new Date(h.checkInDate));
      const co = toDateStr(new Date(h.checkOutDate));
      return ci <= dateStr && dateStr <= co;
    });
  }


  return (
    <div className="flex flex-col gap-8">

      {/* ── Sección 1: Próximos días ─────────────────────────────────────── */}
      {activityDates.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Próximos días
            </h2>
            <Link
              href={`/trips/${tripId}?tab=itinerario`}
              className="text-xs text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
            >
              Ver itinerario →
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {activityDates.map((dateStr) => {
              const { dayNum, weekday, monthYear } = parseDateHeader(dateStr);
              const acts = byDate.get(dateStr) ?? [];
              const dayHotels = hotelsForDay(dateStr);
              const isEmpty = acts.length === 0;

              return (
                <div
                  key={dateStr}
                  className="rounded-2xl border border-zinc-100 bg-white shadow-sm ring-1 ring-black/3 overflow-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:ring-white/5"
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-zinc-100 md:px-5 md:py-4 dark:border-zinc-700">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                        <span className="text-[9px] font-semibold leading-none tracking-widest opacity-60 capitalize">
                          {weekday.slice(0, 3).toUpperCase()}
                        </span>
                        <span className="text-base font-bold leading-tight">{dayNum}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 capitalize dark:text-zinc-200">
                          {monthYear}
                        </p>
                        {!isEmpty && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {acts.length} actividad{acts.length !== 1 ? "es" : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Hotel badge */}
                    {dayHotels.length > 0 && (
                      <div className="flex items-center gap-1 shrink-0">
                        {dayHotels.slice(0, 2).map((h, i) => (
                          <span key={h.id} className="flex items-center gap-1">
                            {i > 0 && <span className="text-zinc-300 text-xs dark:text-zinc-600">→</span>}
                            <Link
                              href={`/trips/${tripId}?tab=itinerario&hotelId=${h.id}`}
                              className="flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors dark:bg-blue-950 dark:border-blue-900 dark:text-blue-400"
                            >
                              {i === 0 && <span>🏨</span>}
                              <span className="max-w-24 truncate">{h.name}</span>
                            </Link>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  {isEmpty ? (
                    <div className="flex items-center justify-center px-5 py-8">
                      <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">☀️ Día libre</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
                      {acts.map((act) => (
                        <div key={act.id} className="flex items-start gap-3 px-4 py-3 md:px-5">
                          <div className="w-14 shrink-0 pt-0.5">
                            {act.activityTime && (
                              <div className="rounded-lg bg-zinc-900 px-2 py-1.5 text-center dark:bg-zinc-100">
                                <span className="text-xs font-semibold tabular-nums text-white dark:text-zinc-900">
                                  {act.activityTime}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-zinc-900 text-sm leading-snug dark:text-zinc-100">
                              {act.title}
                            </p>
                            {act.description && (
                              <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed dark:text-zinc-400 line-clamp-2">
                                {act.description}
                              </p>
                            )}
                            {act.location && (
                              <a
                                href={getMapsUrl(act.location, act.locationLat, act.locationLng)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                              >
                                <span>📍</span>
                                {act.location}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Sección 2: Cerca de ti ───────────────────────────────────────── */}
      <section>
        <NearbyActivities
          items={items}
          itemsHref={`/trips/${tripId}?tab=actividades`}
          viewAllHref={`/trips/${tripId}?tab=actividades`}
          alwaysOpen
        />
      </section>

      {/* ── Sección 3: Mi liquidación ────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Mi liquidación
          </h2>
          <Link
            href={`/trips/${tripId}?tab=gastos`}
            className="text-xs text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
          >
            Ver gastos →
          </Link>
        </div>
        <MySettlementBanner settlements={mySettlements} myParticipantId={myParticipantId} />
      </section>
    </div>
  );
}
