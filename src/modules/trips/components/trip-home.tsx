import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calculateSettlement } from "@/modules/expenses/lib/settlement";
import { MySettlementBanner } from "@/modules/expenses/components/my-settlement-banner";
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
    weekday: date.toLocaleDateString("es-CL", { weekday: "short" }).toUpperCase().slice(0, 3),
    dateLabel: date.toLocaleDateString("es-CL", { day: "numeric", month: "long" }),
  };
}

function getPreviewDays(startDate: Date | null, endDate: Date | null): string[] {
  if (!startDate) return [];
  const startStr = toDateStr(startDate);
  const endStr = endDate ? toDateStr(endDate) : null;
  const todayStr = toDateStr(new Date());
  if (endStr && todayStr > endStr) return [];
  const day1 = !endStr || todayStr < startStr ? startStr : todayStr;
  const days: string[] = [day1];
  for (let i = 1; i <= 2; i++) {
    const next = addDays(day1, i);
    if (!endStr || next <= endStr) days.push(next);
  }
  return days;
}

type TripStatus =
  | { type: "upcoming"; daysUntil: number }
  | { type: "active"; currentDay: number; tripDays: number | null }
  | { type: "ended" };

function getTripStatus(startDate: Date | null, endDate: Date | null): TripStatus | null {
  if (!startDate) return null;
  const startStr = toDateStr(startDate);
  const endStr = endDate ? toDateStr(endDate) : null;
  const todayStr = toDateStr(new Date());
  const start = new Date(startStr + "T00:00:00Z");
  const today = new Date(todayStr + "T00:00:00Z");
  const daysUntil = Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil > 0) return { type: "upcoming", daysUntil };
  if (endStr && todayStr > endStr) return { type: "ended" };
  const tripDays = endStr
    ? Math.round((new Date(endStr + "T00:00:00Z").getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : null;
  const currentDay = Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return { type: "active", currentDay, tripDays };
}

function avatarBg(id: string): string {
  const colors = ["#7c3aed", "#2563eb", "#d97706", "#059669", "#dc2626", "#0891b2", "#9333ea", "#ea580c"];
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

function roleLbl(role: string): string {
  const map: Record<string, string> = { ADMIN: "Admin", EDITOR: "Editor", VIEWER: "Invitado", MEMBER: "Miembro" };
  return map[role] ?? role;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type Participant = { id: string; name: string };
type ParticipantChip = { id: string; name: string; image?: string | null; role: string };
type ActivityRow = {
  id: string; title: string; description: string | null;
  location: string | null; locationLat: number | null; locationLng: number | null;
  activityDate: Date | null; activityTime: string | null;
};

// ─── Main component ────────────────────────────────────────────────────────────

export async function TripHome({
  tripId, tripName, tripDestination, coverImageUrl,
  tripStartDate, tripEndDate, myParticipantId,
  participants, participantsWithRoles, defaultCurrency,
}: {
  tripId: string; tripName: string; tripDestination?: string | null; coverImageUrl?: string | null;
  tripStartDate: Date | null; tripEndDate: Date | null; myParticipantId: string;
  participants: Participant[]; participantsWithRoles: ParticipantChip[]; defaultCurrency: string;
}) {
  const activityDates = getPreviewDays(tripStartDate, tripEndDate);
  const tripStatus = getTripStatus(tripStartDate, tripEndDate);
  const todayStr = toDateStr(new Date());

  const [activities, hotels, items, standaloneActivities, activityCount, itemCount, rawExpenses, rawPayments] = await Promise.all([
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
            id: true, title: true, description: true, location: true,
            locationLat: true, locationLng: true, activityDate: true, activityTime: true,
          },
          orderBy: [{ activityDate: "asc" }, { activityTime: "asc" }],
        })
      : Promise.resolve([] as ActivityRow[]),

    prisma.hotel.findMany({
      where: { tripId },
      select: { id: true, name: true, checkInDate: true, checkOutDate: true },
    }),

    prisma.item.findMany({
      where: { tripId },
      select: { id: true, title: true, type: true, location: true, locationLat: true, locationLng: true },
      orderBy: { createdAt: "asc" },
      take: 10,
    }),

    // Itinerary activities with coords not linked to an item (for Nearby panel)
    prisma.activity.findMany({
      where: { tripId, itemId: null, locationLat: { not: null }, locationLng: { not: null } },
      select: { id: true, title: true, location: true, locationLat: true, locationLng: true, activityDate: true },
    }),

    prisma.activity.count({ where: { tripId } }),
    prisma.item.count({ where: { tripId } }),

    prisma.expense.findMany({
      where: { tripId, isActive: true },
      select: {
        id: true, amount: true, currency: true,
        paidBy: { select: { id: true } },
        participants: { select: { participantId: true, amount: true, paid: true, participant: { select: { id: true } } } },
      },
    }),

    prisma.payment.findMany({
      where: { tripId },
      select: {
        id: true, amount: true, currency: true,
        fromParticipant: { select: { id: true } },
        toParticipant: { select: { id: true } },
      },
    }),
  ]);

  // Settlement
  const expensesForSettlement = rawExpenses.map((e) => ({
    id: e.id, amount: e.amount, currency: e.currency,
    paidByParticipantId: e.paidBy?.id ?? null,
    participants: e.participants.map((ep) => ({ participantId: ep.participant.id, amount: ep.amount })),
  }));
  const paymentsForSettlement = rawPayments.map((p) => ({
    id: p.id, fromParticipantId: p.fromParticipant.id, toParticipantId: p.toParticipant.id,
    amount: p.amount, currency: p.currency,
  }));
  const paidSplitPayments = rawExpenses.filter((e) => e.paidBy).flatMap((e) =>
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
    expensesForSettlement, participants, [...paymentsForSettlement, ...paidSplitPayments],
  );
  const mySettlements = settlements.filter(
    (s) => s.fromId === myParticipantId || s.toId === myParticipantId,
  );
  const iOweAny = mySettlements.some((s) => s.fromId === myParticipantId);
  const theyOweAny = mySettlements.some((s) => s.toId === myParticipantId);

  // Group activities by date
  const byDate = new Map<string, ActivityRow[]>();
  for (const act of activities) {
    if (!act.activityDate) continue;
    const key = toDateStr(new Date(act.activityDate));
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(act);
  }
  function hotelsForDay(dateStr: string) {
    return hotels.filter((h) => {
      const ci = toDateStr(new Date(h.checkInDate));
      const co = toDateStr(new Date(h.checkOutDate));
      return ci <= dateStr && dateStr <= co;
    });
  }

  // ── Hero helpers ──
  const fmtShort = (d: Date | string) =>
    new Date(d).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  const dateRange = tripStartDate
    ? `${fmtShort(tripStartDate)}${tripEndDate ? ` – ${fmtShort(tripEndDate)}` : ""}${
        tripStartDate && tripEndDate
          ? ` · ${Math.round((new Date(tripEndDate).getTime() - new Date(tripStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} días`
          : ""
      }`
    : null;

  const progressPct =
    tripStatus?.type === "active" && tripStatus.tripDays
      ? Math.min(100, Math.round(((tripStatus.currentDay - 1) / tripStatus.tripDays) * 100))
      : null;

  const myRole = participantsWithRoles.find((p) => p.id === myParticipantId)?.role ?? "";

  const daysRemaining =
    tripStatus?.type === "active" && tripStatus.tripDays
      ? tripStatus.tripDays - tripStatus.currentDay
      : null;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div>

      {/* ── Hero Banner ─── flush/edge-to-edge ────────────────────────────────── */}
      <div id="tutorial-trip-hero" className="-mx-4 -mt-6 md:-mx-6 md:-mt-8 relative h-44 sm:h-56 rounded-b-[20px] overflow-hidden mb-5">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #533483 100%)" }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.25) 100%)" }}
        />

        {/* Top badges */}
        <div className="absolute top-3.5 left-4 flex gap-1.5">
          {tripStatus && (
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm border ${
                tripStatus.type === "active"
                  ? "bg-violet-500/30 border-violet-500/50 text-violet-300"
                  : "bg-white/10 border-white/20 text-white/70"
              }`}
            >
              {tripStatus.type === "active"
                ? "● En curso"
                : tripStatus.type === "upcoming"
                ? `Faltan ${tripStatus.daysUntil}d`
                : "Terminado"}
            </span>
          )}
          {myRole && (
            <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm bg-white/10 border border-white/20 text-white/70">
              {roleLbl(myRole)}
            </span>
          )}
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 sm:px-6 sm:pb-5">
          {tripDestination && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">
              📍 {tripDestination}
            </p>
          )}
          <h2 className="text-[22px] sm:text-[28px] font-extrabold text-white leading-tight">{tripName}</h2>
          {dateRange && <p className="text-[11px] text-white/40 mt-0.5 mb-3">{dateRange}</p>}

          <div className="flex items-center justify-between">
            {/* Avatars */}
            <div className="flex items-center gap-2">
              <div className="flex">
                {participantsWithRoles.slice(0, 3).map((p, i) => {
                  const initials = p.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  return p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.id}
                      src={p.image}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className={`w-6.5 h-6.5 rounded-full border-2 border-black/40 object-cover${i > 0 ? " -ml-1.5" : ""}`}
                    />
                  ) : (
                    <div
                      key={p.id}
                      className={`w-[26px] h-[26px] rounded-full border-2 border-black/40 flex items-center justify-center${i > 0 ? " -ml-1.5" : ""}`}
                      style={{ background: avatarBg(p.id) }}
                    >
                      <span className="text-[9px] font-bold text-white">{initials}</span>
                    </div>
                  );
                })}
                {participantsWithRoles.length > 3 && (
                  <div className="w-[26px] h-[26px] rounded-full border-2 border-black/40 bg-white/15 flex items-center justify-center -ml-1.5">
                    <span className="text-[8px] font-bold text-white/70">+{participantsWithRoles.length - 3}</span>
                  </div>
                )}
              </div>
              <span className="text-[11px] text-white/45">{participantsWithRoles.length} participantes</span>
            </div>

            {/* Progress bar */}
            {tripStatus?.type === "active" && tripStatus.tripDays && progressPct !== null && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-white/35">
                  Día {tripStatus.currentDay} de {tripStatus.tripDays}
                </span>
                <div className="w-[90px] sm:w-[120px] h-[3px] rounded-full overflow-hidden bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progressPct}%`,
                      background: "linear-gradient(to right, #a78bfa, #60a5fa)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats grid ────────────────────────────────────────────────────────── */}
      <div id="tutorial-trip-stats" className="grid grid-cols-3 gap-2 sm:gap-2.5 mb-6">

        {/* Chip 1: Días */}
        <div className="bg-zinc-50 border border-zinc-100 dark:bg-[#18191c] dark:border-[#27272a] rounded-2xl p-3 sm:p-3.5 flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600 mb-1">
            {tripStatus?.type === "active" ? "Días restantes" : tripStatus?.type === "upcoming" ? "Faltan" : "Estado"}
          </span>
          {tripStatus?.type === "active" ? (
            <>
              <span className="text-[20px] sm:text-[24px] font-extrabold text-violet-500 dark:text-violet-400 leading-none">
                {daysRemaining ?? 0}
              </span>
              {tripEndDate && (
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                  termina {fmtShort(tripEndDate)}
                </span>
              )}
            </>
          ) : tripStatus?.type === "upcoming" ? (
            <>
              <span className="text-[20px] sm:text-[24px] font-extrabold text-blue-500 dark:text-blue-400 leading-none">
                {tripStatus.daysUntil}d
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">para empezar</span>
            </>
          ) : tripStatus?.type === "ended" ? (
            <>
              <span className="text-base leading-none mt-1">🏁</span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">Terminado</span>
            </>
          ) : (
            <span className="text-[13px] font-semibold text-zinc-400 dark:text-zinc-600 mt-1">Sin fecha</span>
          )}
        </div>

        {/* Chip 2: Mi saldo */}
        <div className="bg-zinc-50 border border-zinc-100 dark:bg-[#18191c] dark:border-[#27272a] rounded-2xl p-3 sm:p-3.5 flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600 mb-1">Mi saldo</span>
          {mySettlements.length === 0 ? (
            <span className="text-[20px] sm:text-[24px] font-extrabold text-emerald-500 dark:text-emerald-400 leading-none">Al día</span>
          ) : (
            <div className="flex flex-col gap-1.5 mt-0.5">
              {iOweAny && (
                <div className="flex items-center gap-1.5">
                  <div className="w-[5px] h-[5px] rounded-full bg-amber-500 shrink-0" />
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-500">Debo</span>
                </div>
              )}
              {theyOweAny && (
                <div className="flex items-center gap-1.5">
                  <div className="w-[5px] h-[5px] rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-500">Me deben</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chip 3: Actividades */}
        <div className="bg-zinc-50 border border-zinc-100 dark:bg-[#18191c] dark:border-[#27272a] rounded-2xl p-3 sm:p-3.5 flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600 mb-1">Actividades</span>
          <span className="text-[20px] sm:text-[24px] font-extrabold text-zinc-800 dark:text-zinc-200 leading-none">
            {activityCount}
          </span>
          {itemCount > 0 && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
              {itemCount} propuesta{itemCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* ── Participants ─────────────────────────────────────────────────────── */}
      <div id="tutorial-trip-participants" className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Participantes
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {participantsWithRoles.map((p) => {
            const initials = p.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div
                key={p.id}
                className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white dark:bg-[#18191c] dark:border-[#27272a] py-1.5 pr-3 pl-1.5"
              >
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt={p.name} referrerPolicy="no-referrer" className="h-5.5 w-5.5 rounded-full object-cover shrink-0" />
                ) : (
                  <div
                    className="h-[22px] w-[22px] rounded-full flex items-center justify-center shrink-0"
                    style={{ background: avatarBg(p.id) }}
                  >
                    <span className="text-[8px] font-bold text-white">{initials}</span>
                  </div>
                )}
                <div>
                  <p className="text-[12px] font-medium text-zinc-700 dark:text-zinc-400 leading-none">
                    {p.name.split(" ")[0]}
                  </p>
                  <p
                    className={`text-[9px] leading-none mt-0.5 ${
                      p.role === "ADMIN" ? "text-violet-500 dark:text-violet-400" : "text-zinc-400 dark:text-zinc-600"
                    }`}
                  >
                    {roleLbl(p.role)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Próximos días ────────────────────────────────────────────────────── */}
      {activityDates.length > 0 && (
        <div id="tutorial-trip-upcoming" className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Próximos días
            </span>
            <Link
              href={`/trips/${tripId}?tab=itinerario`}
              className="text-[11px] text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
            >
              Ver itinerario →
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            {activityDates.map((dateStr) => {
              const { dayNum, weekday, dateLabel } = parseDateHeader(dateStr);
              const acts = byDate.get(dateStr) ?? [];
              const dayHotels = hotelsForDay(dateStr);
              const isEmpty = acts.length === 0;
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={dateStr}
                  className={`rounded-2xl border overflow-hidden ${
                    isToday
                      ? "border-violet-500/40 dark:border-violet-700/40 bg-violet-50/30 dark:bg-[rgba(139,92,246,0.04)]"
                      : "border-zinc-100 dark:border-[#27272a] bg-white dark:bg-[#18191c]"
                  }`}
                >
                  {/* Day header */}
                  <div className="flex items-center gap-3 px-3.5 py-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                        isToday ? "" : "bg-zinc-100 dark:bg-[#27272a]"
                      }`}
                      style={isToday ? { background: "#7c3aed" } : undefined}
                    >
                      <span
                        className={`text-[8px] font-bold uppercase tracking-wide leading-none ${
                          isToday ? "" : "text-zinc-400 dark:text-zinc-600"
                        }`}
                        style={isToday ? { color: "rgba(255,255,255,0.65)" } : undefined}
                      >
                        {weekday}
                      </span>
                      <span
                        className={`text-[17px] font-extrabold leading-tight ${
                          isToday ? "text-white" : "text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {dayNum}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-zinc-600 dark:text-zinc-400">{dateLabel}</p>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          isToday ? "text-violet-500 dark:text-violet-400" : "text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        {isEmpty ? "Sin actividades" : `${acts.length} actividad${acts.length !== 1 ? "es" : ""}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isToday && (
                        <div className="flex items-center gap-1 rounded-full px-2.5 py-1 bg-violet-100 dark:bg-[rgba(139,92,246,0.15)] border border-violet-200 dark:border-[rgba(139,92,246,0.25)]">
                          <div className="w-[5px] h-[5px] rounded-full bg-violet-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">Hoy</span>
                        </div>
                      )}
                      {dayHotels.slice(0, 1).map((h) => (
                        <Link
                          key={h.id}
                          href={`/trips/${tripId}?tab=itinerario&hotelId=${h.id}`}
                          className="flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                        >
                          🏨 <span className="max-w-16 truncate">{h.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Activity rows — individual dark cards */}
                  {!isEmpty && (
                    <div className="px-3 pb-3 flex flex-col gap-1.5">
                      {acts.map((act) => (
                        <div
                          key={act.id}
                          className="flex items-center gap-2.5 rounded-xl bg-zinc-50 dark:bg-[#1f2023] px-3 py-2.5"
                        >
                          <span className="text-[15px] shrink-0">🗓️</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-300 truncate">
                              {act.title}
                            </p>
                            {act.location && (
                              <a
                                href={getMapsUrl(act.location, act.locationLat, act.locationLng)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                              >
                                📍 {act.location}
                              </a>
                            )}
                          </div>
                          <span className="text-[12px] font-semibold text-zinc-400 dark:text-zinc-500 shrink-0 tabular-nums">
                            {act.activityTime ?? <span style={{ color: "#3f3f46" }}>—</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Free day */}
                  {isEmpty && (
                    <div className="px-3.5 pb-3.5 flex items-center gap-2">
                      <div className="w-[5px] h-[5px] rounded-full bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                      <span className="text-[12px] text-zinc-400 dark:text-zinc-600">Día libre</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Cerca de ti ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <NearbyActivities
          items={[
            ...items.map((i) => ({ ...i, sourceType: "item" as const, activityDate: null })),
            ...standaloneActivities.map((a) => ({
              id: a.id,
              title: a.title,
              type: "ACTIVITY",
              location: a.location,
              locationLat: a.locationLat,
              locationLng: a.locationLng,
              sourceType: "activity" as const,
              activityDate: a.activityDate ? a.activityDate.toISOString().slice(0, 10) : null,
            })),
          ]}
          tripId={tripId}
          itemsHref={`/trips/${tripId}?tab=actividades`}
          viewAllHref={`/trips/${tripId}?tab=actividades`}
          alwaysOpen
        />
      </div>

      {/* ── Mi liquidación ───────────────────────────────────────────────────── */}
      <div id="tutorial-trip-my-settlement" className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Mi liquidación
          </span>
          <Link
            href={`/trips/${tripId}?tab=gastos`}
            className="text-[11px] text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
          >
            Ver gastos →
          </Link>
        </div>
        <MySettlementBanner settlements={mySettlements} myParticipantId={myParticipantId} />
      </div>
    </div>
  );
}
