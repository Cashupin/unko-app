"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExportButtons } from "@/modules/itinerary/components/export-buttons";

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
  city: string | null;
  checkInDate: string;
  checkOutDate: string;
};

export type CalendarTransport = {
  id: string;
  origin: string;
  destination: string;
  type: string;
  departureDate: string;
  departureTime: string | null;
  arrivalDate: string | null;
  arrivalTime: string | null;
  isPaid: boolean;
  coveredByPass: { name: string } | null;
  isArrival?: boolean;
};

const TRANSPORT_ICONS: Record<string, string> = {
  FLIGHT: "✈️", TRAIN: "🚅", BUS: "🚌", FERRY: "⛴️", CAR: "🚗",
};

type PersonalActivity = {
  id: string;
  date: string;
  title: string;
  time: string | null;
  notes: string | null;
  location: string | null;
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

type HotelDayState = { label: string; isTransition: boolean };

function getHotelDayState(dateStr: string, hotels: CalendarHotel[]): HotelDayState | null {
  const covering = hotels.filter((h) => h.checkInDate <= dateStr && dateStr <= h.checkOutDate);
  if (covering.length === 0) return null;
  if (covering.length >= 2) {
    const sorted = [...covering].sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
    return {
      label: `${sorted[0].city ?? sorted[0].name} → ${sorted[1].city ?? sorted[1].name}`,
      isTransition: true,
    };
  }
  return { label: covering[0].city ?? covering[0].name, isTransition: false };
}

function countNights(checkIn: string, checkOut: string): number {
  return Math.round(
    (new Date(checkOut + "T00:00:00Z").getTime() - new Date(checkIn + "T00:00:00Z").getTime()) /
      (1000 * 60 * 60 * 24),
  );
}

function fmtShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

const MONTHS_ES_EXPORT = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const WEEKDAYS_EXPORT   = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

function numDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstWeekdayMonStart(year: number, month: number): number {
  const dow = new Date(year, month - 1, 1).getDay();
  return dow === 0 ? 6 : dow - 1;
}

function getMonthsInRange(start: string | null, end: string | null): { year: number; month: number }[] {
  if (!start || !end) return [];
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  const months: { year: number; month: number }[] = [];
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push({ year: y, month: m });
    m++; if (m > 12) { m = 1; y++; }
  }
  return months;
}

// ─── Day Detail Modal ─────────────────────────────────────────────────────────

function DayDetailModal({
  dateStr,
  activities,
  transports,
  hotelLabel,
  onClose,
  personalMode,
  personalActivities,
  tripId,
  onPersonalChange,
}: {
  dateStr: string;
  activities: CalendarActivity[];
  transports: CalendarTransport[];
  hotelLabel: string | null;
  onClose: () => void;
  personalMode: boolean;
  personalActivities: PersonalActivity[];
  tripId: string;
  onPersonalChange: () => void;
}) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekdayShort = WEEKDAYS_SHORT[date.getDay()];

  const [addingPersonal, setAddingPersonal] = useState(false);
  const [personalTitle, setPersonalTitle] = useState("");
  const [personalTime, setPersonalTime] = useState("");
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAddPersonal() {
    if (!personalTitle.trim()) return;
    setSavingPersonal(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/personal-activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          title: personalTitle.trim(),
          time: personalTime || undefined,
        }),
      });
      if (res.ok) {
        setPersonalTitle("");
        setPersonalTime("");
        setAddingPersonal(false);
        onPersonalChange();
      }
    } finally {
      setSavingPersonal(false);
    }
  }

  async function handleDeletePersonal(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/trips/${tripId}/personal-activities/${id}`, { method: "DELETE" });
      onPersonalChange();
    } finally {
      setDeletingId(null);
    }
  }

  // Merge transports + activities sorted by time for chronological rendering
  type ModalItem =
    | { kind: "transport"; t: CalendarTransport; time: string }
    | { kind: "activity"; a: CalendarActivity; time: string };
  const mergedItems: ModalItem[] = [
    ...transports.map((t) => ({ kind: "transport" as const, t, time: t.isArrival ? (t.arrivalTime ?? "") : (t.departureTime ?? "") })),
    ...activities.map((a) => ({ kind: "activity" as const, a, time: a.activityTime ?? "" })),
  ].sort((x, y) => x.time.localeCompare(y.time));

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
                  {activities.length === 0 && transports.length === 0
                    ? "Día libre"
                    : [
                        activities.length > 0 && `${activities.length} actividad${activities.length !== 1 ? "es" : ""}`,
                        transports.length > 0 && `${transports.length} transporte${transports.length !== 1 ? "s" : ""}`,
                      ].filter(Boolean).join(" · ")}
                </p>
                {hotelLabel && (
                  <p className="mt-0.5 text-sm text-zinc-400">📍 {hotelLabel}</p>
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

        {/* Mi plan personal */}
        {personalMode && (
          <div className="border-t border-[#27272a] px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-violet-400">
                🔒 Mi plan
              </p>
              {!addingPersonal && (
                <button
                  type="button"
                  onClick={() => setAddingPersonal(true)}
                  className="rounded-lg border border-violet-700/40 bg-violet-900/20 px-2.5 py-1 text-xs font-semibold text-violet-400 transition-colors hover:bg-violet-900/40"
                >
                  + Añadir
                </button>
              )}
            </div>

            {/* Personal activities list */}
            {personalActivities.length > 0 && (
              <div className="mb-3 flex flex-col gap-2">
                {personalActivities.map((pa) => (
                  <div key={pa.id} className="flex items-center justify-between rounded-xl border border-violet-700/30 bg-violet-900/20 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {pa.time && (
                          <span className="shrink-0 rounded bg-violet-900/60 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-violet-300">
                            {pa.time}
                          </span>
                        )}
                        <span className="truncate text-sm font-medium text-violet-100">{pa.title}</span>
                      </div>
                      {pa.location && (
                        <p className="mt-0.5 text-xs text-violet-400/70">📍 {pa.location}</p>
                      )}
                      {pa.notes && (
                        <p className="mt-0.5 text-xs italic text-violet-400/60">{pa.notes}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePersonal(pa.id)}
                      disabled={deletingId === pa.id}
                      className="ml-2 shrink-0 rounded p-1 text-violet-500 transition-colors hover:bg-violet-900/40 hover:text-violet-300 disabled:opacity-40"
                    >
                      {deletingId === pa.id ? "…" : "✕"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {personalActivities.length === 0 && !addingPersonal && (
              <p className="text-xs text-violet-400/60">Sin plan personal para este día.</p>
            )}

            {/* Add form */}
            {addingPersonal && (
              <div className="flex flex-col gap-2 rounded-xl border border-violet-700/40 bg-violet-900/20 p-3">
                <input
                  autoFocus
                  type="text"
                  placeholder="¿Qué vas a hacer?"
                  value={personalTitle}
                  onChange={(e) => setPersonalTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddPersonal()}
                  className="w-full rounded-lg border border-violet-700/40 bg-[#0f1419] px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500"
                />
                <input
                  type="time"
                  value={personalTime}
                  onChange={(e) => setPersonalTime(e.target.value)}
                  className="w-32 rounded-lg border border-violet-700/40 bg-[#0f1419] px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-violet-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddPersonal}
                    disabled={savingPersonal || !personalTitle.trim()}
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                  >
                    {savingPersonal ? "Guardando…" : "Guardar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddingPersonal(false); setPersonalTitle(""); setPersonalTime(""); }}
                    className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-[#27272a] hover:text-zinc-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transports + Activities — chronological */}
        <div className="flex flex-col gap-3 p-5">
          {mergedItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              ☀️ No hay actividades programadas para este día
            </div>
          ) : (
            mergedItems.map((item) =>
              item.kind === "transport" ? (
                <div
                  key={item.t.isArrival ? `${item.t.id}-arr` : item.t.id}
                  className={`rounded-xl border p-3 ${item.t.isArrival ? "border-blue-900/30 bg-[#080f18] opacity-75" : "border-blue-900/50 bg-[#0d1b2e]"}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base">{TRANSPORT_ICONS[item.t.type]}</span>
                    <span className={`font-semibold ${item.t.isArrival ? "text-blue-300/70" : "text-blue-100"}`}>
                      {item.t.origin} → {item.t.destination}
                    </span>
                    {item.t.isArrival && (
                      <span className="rounded border border-blue-800/40 bg-blue-900/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                        Llegada
                      </span>
                    )}
                    {!item.t.isArrival && item.t.coveredByPass && (
                      <span className="rounded border border-blue-700/40 bg-blue-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                        📦 {item.t.coveredByPass.name}
                      </span>
                    )}
                  </div>
                  {item.t.isArrival ? (
                    item.t.arrivalTime && (
                      <p className="mt-1.5 text-xs text-blue-300/50">Llegada: {item.t.arrivalTime}</p>
                    )
                  ) : (
                    (item.t.departureTime || item.t.arrivalTime) && (
                      <p className="mt-1.5 text-xs text-blue-300/70">
                        {item.t.departureTime && `Salida: ${item.t.departureTime}`}
                        {item.t.departureTime && item.t.arrivalTime && " · "}
                        {item.t.arrivalTime && `Llegada: ${item.t.arrivalTime}`}
                      </p>
                    )
                  )}
                </div>
              ) : (
                <div
                  key={item.a.id}
                  className="rounded-xl border border-[#27272a] bg-[#18191c]/60 p-4 transition-colors hover:bg-[#18191c]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {item.a.activityTime && (
                          <span className="shrink-0 rounded-md bg-[#27272a] px-2 py-0.5 text-xs font-bold tabular-nums text-zinc-300">
                            {item.a.activityTime}
                          </span>
                        )}
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getActivityPillClass(item.a.title)}`}
                        >
                          {item.a.title.toLowerCase().includes("vuelo") || item.a.title.includes("->") ? "Vuelo" : "Actividad"}
                        </span>
                      </div>
                      <h3 className="font-semibold text-zinc-100">{item.a.title}</h3>
                      {item.a.description && (
                        <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{item.a.description}</p>
                      )}
                      {item.a.location && (
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-500">
                          <span className="text-red-400">📍</span> {item.a.location}
                        </p>
                      )}
                      {item.a.notes && (
                        <p className="mt-1.5 text-xs italic text-zinc-600">{item.a.notes}</p>
                      )}
                    </div>

                    {(item.a.photoUrl ?? item.a.itemImageUrl) && (
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#27272a]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.a.photoUrl ?? item.a.itemImageUrl!}
                          alt={item.a.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            )
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
  transports,
  startDate,
  endDate,
  tripId,
}: {
  activities: CalendarActivity[];
  hotels: CalendarHotel[];
  transports: CalendarTransport[];
  startDate: string | null;
  endDate: string | null;
  tripId: string;
}) {
  const exportRef = useRef<HTMLDivElement>(null);
  const initialStr = startDate ?? todayStr();
  const [year, setYear] = useState(parseInt(initialStr.slice(0, 4)));
  const [month, setMonth] = useState(parseInt(initialStr.slice(5, 7)) - 1); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [personalMode, setPersonalMode] = useState(false);
  const [personalActs, setPersonalActs] = useState<PersonalActivity[]>([]);
  const [loadingPersonal, setLoadingPersonal] = useState(false);

  const today = todayStr();
  const tripStart = startDate;
  const tripEnd   = endDate;

  async function fetchPersonalActs() {
    setLoadingPersonal(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/personal-activities`);
      if (res.ok) {
        const data = (await res.json()) as { activities: PersonalActivity[] };
        setPersonalActs(data.activities);
      }
    } finally {
      setLoadingPersonal(false);
    }
  }

  async function togglePersonalMode() {
    const next = !personalMode;
    setPersonalMode(next);
    if (next && personalActs.length === 0) await fetchPersonalActs();
  }

  // Group activities by date
  const actsByDate = new Map<string, CalendarActivity[]>();
  for (const act of activities) {
    if (!actsByDate.has(act.activityDate)) actsByDate.set(act.activityDate, []);
    actsByDate.get(act.activityDate)!.push(act);
  }

  // Group transports by departure date; also add arrival-day entry when date differs
  const transportsByDate = new Map<string, CalendarTransport[]>();
  for (const t of transports) {
    if (!transportsByDate.has(t.departureDate)) transportsByDate.set(t.departureDate, []);
    transportsByDate.get(t.departureDate)!.push(t);

    if (t.arrivalDate && t.arrivalDate !== t.departureDate) {
      if (!transportsByDate.has(t.arrivalDate)) transportsByDate.set(t.arrivalDate, []);
      transportsByDate.get(t.arrivalDate)!.push({ ...t, isArrival: true });
    }
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

  // Group personal activities by date
  const personalByDate = new Map<string, PersonalActivity[]>();
  for (const pa of personalActs) {
    if (!personalByDate.has(pa.date)) personalByDate.set(pa.date, []);
    personalByDate.get(pa.date)!.push(pa);
  }

  const selectedDateStr      = selectedDay;
  const selectedActs         = selectedDateStr ? (actsByDate.get(selectedDateStr) ?? []) : [];
  const selectedTransports   = selectedDateStr ? (transportsByDate.get(selectedDateStr) ?? []) : [];
  const selectedHotelState   = selectedDateStr ? getHotelDayState(selectedDateStr, hotels) : null;
  const selectedPersonalActs = selectedDateStr ? (personalByDate.get(selectedDateStr) ?? []) : [];

  return (
    <>
      {/* Toolbar — fuera del área capturada */}
      <div className="no-export mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={togglePersonalMode}
          disabled={loadingPersonal}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
            personalMode
              ? "border-violet-700/60 bg-violet-900/30 text-violet-300 hover:bg-violet-900/50"
              : "border-[#27272a] bg-[#18191c]/60 text-zinc-400 hover:bg-[#27272a] hover:text-zinc-200"
          }`}
        >
          🔒 {loadingPersonal ? "Cargando…" : personalMode ? "Vista grupal" : "Mi plan"}
        </button>
        <ExportButtons tripId={tripId} captureRef={exportRef} />
      </div>

      {/* Div oculto fuera de pantalla — captura todos los meses del viaje */}
      <div ref={exportRef} style={{ position: "fixed", top: 0, left: 0, opacity: 0, pointerEvents: "none", width: 920, willChange: "opacity" }} aria-hidden="true">
        <div style={{ background: "#0f1419", padding: 24, width: 920 }}>
          {/* Route summary */}
          {hotels.length > 0 && (
            <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, border: "1px solid #27272a", background: "#18191c" }}>
              <p style={{ marginBottom: 12, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#71717a" }}>Ruta del viaje</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {hotels.map((hotel, i) => (
                  <div key={hotel.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {i > 0 && <span style={{ color: "#52525b" }}>→</span>}
                    <div style={{ borderRadius: 8, border: "1px solid #2a2a3a", background: "#0f1419", padding: "8px 12px" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#f4f4f5" }}>{hotel.city ?? hotel.name}</div>
                      <div style={{ fontSize: 11, color: "#71717a" }}>
                        {countNights(hotel.checkInDate, hotel.checkOutDate)} noches · {fmtShort(hotel.checkInDate)}–{fmtShort(hotel.checkOutDate)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* All months */}
          {getMonthsInRange(startDate, endDate).map(({ year: ey, month: em }) => {
            const leading   = firstWeekdayMonStart(ey, em);
            const totalDays = numDaysInMonth(ey, em);
            type EC = { empty: true } | { empty: false; day: number; ds: string };
            const cells: EC[] = [
              ...Array.from({ length: leading }, (): EC => ({ empty: true })),
              ...Array.from({ length: totalDays }, (_, idx): EC => {
                const d = idx + 1;
                return { empty: false, day: d, ds: `${ey}-${String(em).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
              }),
            ];
            while (cells.length % 7 !== 0) cells.push({ empty: true });
            const mRows: EC[][] = [];
            for (let i = 0; i < cells.length; i += 7) mRows.push(cells.slice(i, i + 7));
            return (
              <div key={`${ey}-${em}`} style={{ marginBottom: 24 }}>
                <div style={{ marginBottom: 8, fontSize: 16, fontWeight: 600, color: "#e4e4e7" }}>{MONTHS_ES_EXPORT[em - 1]} {ey}</div>
                <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
                  <thead><tr>
                    {WEEKDAYS_EXPORT.map((w) => (
                      <th key={w} style={{ border: "1px solid #27272a", background: "#18191c", padding: 6, textAlign: "center", fontSize: 10, fontWeight: 600, color: "#71717a" }}>{w}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {mRows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => {
                          if (cell.empty) return <td key={ci} style={{ border: "1px solid #27272a", padding: 4, height: 80 }} />;
                          const { day, ds } = cell;
                          const inTrip = !!tripStart && !!tripEnd && ds >= tripStart && ds <= tripEnd;
                          const dayActs = actsByDate.get(ds) ?? [];
                          const dayTrans = transportsByDate.get(ds) ?? [];
                          const hs = inTrip ? getHotelDayState(ds, hotels) : null;
                          const exportItems = [
                            ...dayTrans.map((t) => ({ kind: "transport" as const, t, time: t.isArrival ? (t.arrivalTime ?? "") : (t.departureTime ?? "") })),
                            ...dayActs.map((a) => ({ kind: "activity" as const, a, time: a.activityTime ?? "" })),
                          ].sort((x, y) => x.time.localeCompare(y.time));
                          return (
                            <td key={ds} style={{ border: "1px solid #27272a", padding: 4, height: 80, verticalAlign: "top", background: inTrip ? "rgba(24,25,28,0.6)" : "transparent" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3, overflow: "hidden" }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: inTrip ? "#f4f4f5" : "#3f3f46", flexShrink: 0 }}>{day}</span>
                                {hs && (
                                  <span style={{ fontSize: 8, fontWeight: 600, padding: "1px 4px", borderRadius: 3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", border: hs.isTransition ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(56,189,248,0.4)", background: hs.isTransition ? "rgba(109,40,217,0.3)" : "rgba(14,165,233,0.3)", color: hs.isTransition ? "#c4b5fd" : "#7dd3fc" }}>
                                    {hs.label}
                                  </span>
                                )}
                              </div>
                              {exportItems.slice(0, 2).map((item) =>
                                item.kind === "transport" ? (
                                  item.t.isArrival ? (
                                    <div key={`${item.t.id}-arr`} style={{ fontSize: 9, padding: "2px 4px", borderRadius: 3, marginBottom: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", border: "1px solid rgba(59,130,246,0.2)", background: "rgba(29,78,216,0.12)", color: "#93c5fd60" }}>
                                      {TRANSPORT_ICONS[item.t.type]} →{item.t.destination}
                                    </div>
                                  ) : (
                                    <div key={item.t.id} style={{ fontSize: 9, padding: "2px 4px", borderRadius: 3, marginBottom: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", border: "1px solid rgba(59,130,246,0.5)", background: "rgba(29,78,216,0.3)", color: "#93c5fd" }}>
                                      {TRANSPORT_ICONS[item.t.type]} {item.t.origin}→{item.t.destination}
                                    </div>
                                  )
                                ) : (
                                  <div key={item.a.id} style={{ fontSize: 9, padding: "2px 4px", borderRadius: 3, marginBottom: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", ...(getActivityPillClass(item.a.title).includes("blue-") ? { border: "1px solid rgba(99,102,241,0.5)", background: "rgba(79,70,229,0.3)", color: "#a5b4fc" } : { border: "1px solid rgba(52,211,153,0.5)", background: "rgba(16,185,129,0.3)", color: "#6ee7b7" }) }}>
                                    {item.a.title}
                                  </div>
                                )
                              )}
                              {exportItems.length > 2 && <div style={{ fontSize: 9, color: "#71717a" }}>+{exportItems.length - 2}</div>}
                              {inTrip && exportItems.length === 0 && !hs && (
                                <div style={{ fontSize: 9, padding: "2px 4px", borderRadius: 3, border: "1px solid rgba(217,119,6,0.5)", background: "rgba(146,64,14,0.4)", color: "#fcd34d", overflow: "hidden", whiteSpace: "nowrap" }}>Libre</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hotel Route Summary */}
      {hotels.length > 0 && (
        <div className="mb-4 rounded-xl border border-[#27272a] bg-[#18191c]/60 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Ruta del viaje
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {hotels.map((hotel, i) => {
              const nights = countNights(hotel.checkInDate, hotel.checkOutDate);
              const label = hotel.city ?? hotel.name;
              return (
                <div key={hotel.id} className="flex items-center gap-2">
                  {i > 0 && <span className="text-zinc-600">→</span>}
                  <div className="rounded-lg border border-[#2a2a3a] bg-[#0f1419] px-3 py-2">
                    <p className="text-sm font-semibold text-zinc-100">{label}</p>
                    <p className="text-xs text-zinc-500">
                      {nights} noche{nights !== 1 ? "s" : ""} · {fmtShort(hotel.checkInDate)}–{fmtShort(hotel.checkOutDate)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="w-full rounded-2xl bg-[#0f1419] p-4 lg:p-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-zinc-100 lg:text-2xl">
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
        <div className="mb-2 grid grid-cols-7 gap-1 lg:gap-3">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-2 text-center text-xs font-medium text-zinc-500 lg:text-sm">
              <span className="hidden lg:inline">{d}</span>
              <span className="lg:hidden">{d.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1 lg:gap-3">
          {/* Leading empty cells */}
          {Array.from({ length: leadingEmpties }).map((_, i) => (
            <div key={`e-${i}`} className="min-h-20 lg:min-h-36" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isInTrip     = !!tripStart && !!tripEnd && dateStr >= tripStart && dateStr <= tripEnd;
            const isToday      = dateStr === today;
            const dayActs      = isInTrip ? (actsByDate.get(dateStr) ?? []) : [];
            const dayTransports = isInTrip ? (transportsByDate.get(dateStr) ?? []) : [];
            const myActs       = personalMode && isInTrip ? (personalByDate.get(dateStr) ?? []) : [];
            const hotelState   = isInTrip ? getHotelDayState(dateStr, hotels) : null;
            const hasActs      = dayActs.length > 0 || myActs.length > 0 || dayTransports.length > 0;
            // Chronological order, capped to MAX_PILLS total
            const allItems: Array<{ type: "transport"; t: CalendarTransport; time: string } | { type: "activity"; a: CalendarActivity; time: string }> = [
              ...dayTransports.map((t) => ({ type: "transport" as const, t, time: t.isArrival ? (t.arrivalTime ?? "") : (t.departureTime ?? "") })),
              ...dayActs.map((a) => ({ type: "activity" as const, a, time: a.activityTime ?? "" })),
            ].sort((x, y) => x.time.localeCompare(y.time));
            const visible  = allItems.slice(0, MAX_PILLS);
            const overflow = allItems.length - MAX_PILLS;

            if (!isInTrip) {
              return (
                <div key={day} className="min-h-20 rounded-xl p-2 lg:min-h-36 lg:p-3">
                  <span className="text-xs font-semibold text-zinc-700 lg:text-sm">{day}</span>
                </div>
              );
            }

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(selectedDay === dateStr ? null : dateStr)}
                className={[
                  "min-h-20 cursor-pointer rounded-xl border p-2 transition-all lg:min-h-36 lg:p-3",
                  hasActs
                    ? "border-[#27272a] bg-[#18191c]/60 hover:bg-[#18191c]"
                    : "border-[#1e2533] bg-[#18191c]/30 hover:bg-[#18191c]/50",
                  selectedDay === dateStr ? "ring-1 ring-violet-500/40" : "",
                ].join(" ")}
              >
                {/* Day number + city */}
                <div className="mb-1 flex flex-col gap-0.5 lg:mb-2 lg:flex-row lg:items-center lg:justify-between lg:gap-1">
                  <span
                    className={[
                      "shrink-0 text-xs font-semibold lg:text-sm",
                      isToday ? "text-violet-400" : hasActs ? "text-zinc-100" : "text-zinc-500",
                    ].join(" ")}
                  >
                    {day}
                  </span>
                  {hotelState && (
                    <span className={`min-w-0 overflow-hidden whitespace-nowrap rounded border px-1 py-0.5 text-[10px] font-semibold lg:px-1.5 ${hotelState.isTransition ? "border-violet-700/40 bg-violet-900/30 text-violet-300" : "border-sky-700/40 bg-sky-900/30 text-sky-300"}`}>
                      {hotelState.label}
                    </span>
                  )}
                </div>

                {/* Pills */}
                <div className="flex flex-col gap-0.5 lg:gap-1">
                  {allItems.length === 0 && myActs.length === 0 ? (
                    <div className="truncate rounded border border-amber-700/50 bg-amber-900/40 px-1 py-0.5 text-[10px] font-medium text-amber-300 lg:px-2 lg:py-1 lg:text-xs">
                      {personalMode ? "Sin plan" : "Libre"}
                    </div>
                  ) : (
                    <>
                      {visible.map((item) =>
                        item.type === "transport" ? (
                          item.t.isArrival ? (
                            <div
                              key={`${item.t.id}-arr`}
                              className="truncate rounded border border-blue-900/30 bg-blue-900/20 px-1 py-0.5 text-[10px] font-medium text-blue-400/50 lg:px-2 lg:py-1 lg:text-xs"
                              title={`Llegada: ${item.t.origin} → ${item.t.destination}`}
                            >
                              {TRANSPORT_ICONS[item.t.type]} →{item.t.destination}
                            </div>
                          ) : (
                            <div
                              key={item.t.id}
                              className="truncate rounded border border-blue-700/50 bg-blue-900/40 px-1 py-0.5 text-[10px] font-medium text-blue-300 lg:px-2 lg:py-1 lg:text-xs"
                              title={`${item.t.origin} → ${item.t.destination}`}
                            >
                              {TRANSPORT_ICONS[item.t.type]} {item.t.origin}→{item.t.destination}
                            </div>
                          )
                        ) : (
                          <div
                            key={item.a.id}
                            className={`truncate rounded border px-1 py-0.5 text-[10px] font-medium lg:px-2 lg:py-1 lg:text-xs ${getActivityPillClass(item.a.title)}`}
                            title={item.a.title}
                          >
                            {item.a.title}
                          </div>
                        )
                      )}
                      {overflow > 0 && (
                        <div className="px-1 text-[10px] text-zinc-500 lg:px-2 lg:text-xs">
                          +{overflow} más
                        </div>
                      )}
                      {myActs.map((pa) => (
                        <div
                          key={pa.id}
                          className="truncate rounded border border-violet-700/50 bg-violet-900/40 px-1 py-0.5 text-[10px] font-medium text-violet-300 lg:px-2 lg:py-1 lg:text-xs"
                          title={pa.title}
                        >
                          🔒 {pa.title}
                        </div>
                      ))}
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
          transports={selectedTransports}
          hotelLabel={selectedHotelState?.label ?? null}
          onClose={() => setSelectedDay(null)}
          personalMode={personalMode}
          personalActivities={selectedPersonalActs}
          tripId={tripId}
          onPersonalChange={fetchPersonalActs}
        />
      )}
    </>
  );
}
