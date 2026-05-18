"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

export type CalendarActivity = {
  id: string;
  title: string;
  activityDate: string;
  activityTime: string | null;
  description: string | null;
  location: string | null;
  notes: string | null;
  photoUrl: string | null;
  itemImageUrl: string | null;
};

export type CalendarHotel = {
  id: string;
  name: string;
  checkInDate: string;
  checkOutDate: string;
};

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const MONTHS_ES_LONG = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
];
const WEEKDAYS_SHORT = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

const MAX_PILLS = 3;

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayStr(): string {
  return toDateStr(new Date());
}

function getActivityPillClass(title: string): string {
  const lower = title.toLowerCase();
  if (
    lower.includes("vuelo") || lower.includes("avión") || lower.includes("flight") ||
    lower.includes("aeropuerto") || lower.includes("airport") || lower.includes("->") ||
    lower.includes("→") || lower.includes("salida") || lower.includes("llegada")
  ) {
    return "bg-blue-900/40 border border-blue-700/50 text-blue-300";
  }
  return "bg-emerald-900/40 border border-emerald-700/50 text-emerald-300";
}

function formatDayHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = WEEKDAYS_SHORT[date.getDay()].toLowerCase();
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${d} de ${MONTHS_ES_LONG[m - 1]} ${y}`;
}

function getHotelForDay(dateStr: string, hotels: CalendarHotel[]): CalendarHotel | null {
  return hotels.find((h) => h.checkInDate <= dateStr && dateStr <= h.checkOutDate) ?? null;
}

// ─── Day Detail Modal ─────────────────────────────────────────────────────────

function DayDetailModal({
  dateStr,
  activities,
  hotel,
  onClose,
}: {
  dateStr: string;
  activities: CalendarActivity[];
  hotel: CalendarHotel | null;
  onClose: () => void;
}) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekdayShort = WEEKDAYS_SHORT[date.getDay()];

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/75" />
      <div
        className="relative z-10 w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[#27272a] bg-[#0f1419] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="sticky top-0 z-10 rounded-t-2xl border-b border-[#27272a] bg-[#0f1419] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Day badge */}
              <div className="flex min-w-14 flex-col items-center justify-center rounded-xl bg-zinc-100 px-2 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {weekdayShort}
                </span>
                <span className="text-2xl font-bold leading-tight text-zinc-900">{d}</span>
              </div>

              {/* Info */}
              <div>
                <p className="text-lg font-semibold text-zinc-100">
                  {d} de {MONTHS_ES_LONG[m - 1]}
                </p>
                <p className="text-sm text-zinc-500">
                  {activities.length === 0
                    ? "Día libre"
                    : `${activities.length} actividad${activities.length !== 1 ? "es" : ""}`}
                </p>
                {hotel && (
                  <p className="mt-0.5 text-sm text-zinc-400">📍 {hotel.name}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-[#27272a] hover:text-zinc-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Activities */}
        <div className="flex flex-col gap-3 p-5">
          {activities.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              ☀️ No hay actividades programadas para este día
            </div>
          ) : (
            activities.map((act) => (
              <div
                key={act.id}
                className="rounded-xl border border-[#27272a] bg-[#18191c]/60 p-4 transition-colors hover:bg-[#18191c]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {act.activityTime && (
                        <span className="shrink-0 rounded-md bg-[#27272a] px-2 py-0.5 text-xs font-bold tabular-nums text-zinc-300">
                          {act.activityTime}
                        </span>
                      )}
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getActivityPillClass(act.title)}`}
                      >
                        {act.title.toLowerCase().includes("vuelo") || act.title.includes("->") ? "Vuelo" : "Actividad"}
                      </span>
                    </div>
                    <h3 className="font-semibold text-zinc-100">{act.title}</h3>
                    {act.description && (
                      <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{act.description}</p>
                    )}
                    {act.location && (
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-500">
                        <span className="text-red-400">📍</span> {act.location}
                      </p>
                    )}
                    {act.notes && (
                      <p className="mt-1.5 text-xs italic text-zinc-600">{act.notes}</p>
                    )}
                  </div>

                  {(act.photoUrl ?? act.itemImageUrl) && (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#27272a]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={act.photoUrl ?? act.itemImageUrl!}
                        alt={act.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

// ─── Main calendar ────────────────────────────────────────────────────────────

export function ItineraryCalendar({
  activities,
  hotels,
  startDate,
  endDate,
}: {
  activities: CalendarActivity[];
  hotels: CalendarHotel[];
  startDate: Date | null;
  endDate: Date | null;
}) {
  const initial = startDate ?? new Date();
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const today = todayStr();
  const tripStart = startDate ? toDateStr(startDate) : null;
  const tripEnd   = endDate   ? toDateStr(endDate)   : null;

  // Group activities by date
  const actsByDate = new Map<string, CalendarActivity[]>();
  for (const act of activities) {
    if (!actsByDate.has(act.activityDate)) actsByDate.set(act.activityDate, []);
    actsByDate.get(act.activityDate)!.push(act);
  }

  // Calendar geometry for current month
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstDay.getDay(); // 0=Sun
  const leadingEmpties = startDow === 0 ? 6 : startDow - 1; // Mon-start offset

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const selectedDateStr = selectedDay;
  const selectedActs    = selectedDateStr ? (actsByDate.get(selectedDateStr) ?? []) : [];
  const selectedHotel   = selectedDateStr ? getHotelForDay(selectedDateStr, hotels) : null;

  return (
    <>
      <div className="w-full rounded-2xl bg-[#0f1419] p-4 sm:p-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-zinc-100 sm:text-2xl">
            {MONTHS_ES[month]} {year}
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#27272a] bg-[#18191c]/50 text-zinc-400 transition-colors hover:bg-[#27272a] hover:text-zinc-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#27272a] bg-[#18191c]/50 text-zinc-400 transition-colors hover:bg-[#27272a] hover:text-zinc-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-3">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-2 text-center text-xs font-medium text-zinc-500 sm:text-sm">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-3">
          {/* Leading empty cells */}
          {Array.from({ length: leadingEmpties }).map((_, i) => (
            <div key={`e-${i}`} className="min-h-20 sm:min-h-36" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isInTrip = !!tripStart && !!tripEnd && dateStr >= tripStart && dateStr <= tripEnd;
            const isToday  = dateStr === today;
            const dayActs  = isInTrip ? (actsByDate.get(dateStr) ?? []) : [];
            const hotel    = isInTrip ? getHotelForDay(dateStr, hotels) : null;
            const hasActs  = dayActs.length > 0;
            const visible  = dayActs.slice(0, MAX_PILLS);
            const overflow = dayActs.length - MAX_PILLS;

            if (!isInTrip) {
              return (
                <div key={day} className="min-h-20 rounded-xl p-2 sm:min-h-36 sm:p-3">
                  <span className="text-xs font-semibold text-zinc-700 sm:text-sm">{day}</span>
                </div>
              );
            }

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(selectedDay === dateStr ? null : dateStr)}
                className={[
                  "min-h-20 cursor-pointer rounded-xl border p-2 transition-all sm:min-h-36 sm:p-3",
                  hasActs
                    ? "border-[#27272a] bg-[#18191c]/60 hover:bg-[#18191c]"
                    : "border-[#1e2533] bg-[#18191c]/30 hover:bg-[#18191c]/50",
                  selectedDay === dateStr ? "ring-1 ring-violet-500/40" : "",
                ].join(" ")}
              >
                {/* Day number */}
                <div className="mb-1 flex items-start justify-between sm:mb-2">
                  <span
                    className={[
                      "text-xs font-semibold sm:text-sm",
                      isToday ? "text-violet-400" : hasActs ? "text-zinc-100" : "text-zinc-500",
                    ].join(" ")}
                  >
                    {day}
                  </span>
                </div>

                {/* City */}
                {hotel && (
                  <div className="mb-1 -mx-2 truncate border-y border-sky-700/40 bg-sky-900/30 px-2 py-0.5 text-[10px] font-semibold text-sky-300 sm:mb-2 sm:-mx-3 sm:px-3 sm:py-1 sm:text-xs">
                    {hotel.name}
                  </div>
                )}

                {/* Pills */}
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  {dayActs.length === 0 ? (
                    <div className="truncate rounded border border-amber-700/50 bg-amber-900/40 px-1 py-0.5 text-[10px] font-medium text-amber-300 sm:px-2 sm:py-1 sm:text-xs">
                      Libre
                    </div>
                  ) : (
                    <>
                      {visible.map((act) => (
                        <div
                          key={act.id}
                          className={`truncate rounded border px-1 py-0.5 text-[10px] font-medium sm:px-2 sm:py-1 sm:text-xs ${getActivityPillClass(act.title)}`}
                          title={act.title}
                        >
                          {act.title}
                        </div>
                      ))}
                      {overflow > 0 && (
                        <div className="px-1 text-[10px] text-zinc-500 sm:px-2 sm:text-xs">
                          +{overflow} más
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <DayDetailModal
          dateStr={selectedDay}
          activities={selectedActs}
          hotel={selectedHotel}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  );
}
