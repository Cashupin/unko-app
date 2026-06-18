import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "./print-button";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const WEEKDAYS_MON = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

function toStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtShort(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMed(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}

function countNights(a: string, b: string): number {
  return Math.round(
    (new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000,
  );
}

function getMonthsInRange(start: string, end: string): { year: number; month: number }[] {
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

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstWeekdayMonStart(year: number, month: number): number {
  const dow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  return dow === 0 ? 6 : dow - 1; // Mon=0 … Sun=6
}

// ─── Types ────────────────────────────────────────────────────────────────────

type HotelRow = {
  id: string; name: string; city: string | null; link: string | null;
  checkInDate: string; checkOutDate: string;
  numberOfNights: number; pricePerNight: number | null; totalPrice: number | null;
  currency: string; address: string | null; notes: string | null; reserved: boolean;
};

type ActivityRow = {
  id: string; title: string; activityDate: string | null;
  activityTime: string | null; location: string | null;
  description: string | null; notes: string | null;
};

type TransportRow = {
  id: string; origin: string; destination: string; type: string;
  departureDate: string | null; departureTime: string | null;
  arrivalDate: string | null; arrivalTime: string | null;
  cost: number | null; currency: string; isPaid: boolean; notes: string | null;
  coveredByPassId: string | null;
  isArrival?: boolean;
};

type PassRow = {
  id: string; name: string;
  validFrom: string | null; validTo: string | null;
  cost: number | null; currency: string; isPaid: boolean; notes: string | null;
  transports: { id: string }[];
};

const PRINT_TRANSPORT_ICONS: Record<string, string> = {
  FLIGHT: "✈️", TRAIN: "🚅", BUS: "🚌", FERRY: "⛴️", CAR: "🚗",
};

// ─── Print Calendar Month ─────────────────────────────────────────────────────

function isFlightActivity(title: string): boolean {
  const l = title.toLowerCase();
  return l.includes("vuelo") || l.includes("flight") || l.includes("->") || l.includes("→") ||
    l.includes("aeropuerto") || l.includes("salida") || l.includes("llegada");
}

type CalCell = { type: "empty" } | { type: "day"; day: number; dateStr: string };

function PrintCalendarMonth({
  year, month, tripStart, tripEnd, activities, hotels, transports,
}: {
  year: number; month: number;
  tripStart: string; tripEnd: string;
  activities: ActivityRow[]; hotels: HotelRow[];
  transports: TransportRow[];
}) {
  const leading = firstWeekdayMonStart(year, month);
  const total   = daysInMonth(year, month);

  const actsByDate = new Map<string, ActivityRow[]>();
  for (const a of activities) {
    if (!a.activityDate) continue;
    if (!actsByDate.has(a.activityDate)) actsByDate.set(a.activityDate, []);
    actsByDate.get(a.activityDate)!.push(a);
  }

  const transByDate = new Map<string, TransportRow[]>();
  for (const t of transports) {
    if (!t.departureDate) continue;
    if (!transByDate.has(t.departureDate)) transByDate.set(t.departureDate, []);
    transByDate.get(t.departureDate)!.push(t);

    if (t.arrivalDate && t.arrivalDate !== t.departureDate) {
      if (!transByDate.has(t.arrivalDate)) transByDate.set(t.arrivalDate, []);
      transByDate.get(t.arrivalDate)!.push({ ...t, isArrival: true });
    }
  }

  function hotelCity(ds: string): string | null {
    const h = hotels.find((h) => h.checkInDate <= ds && ds <= h.checkOutDate);
    return h ? (h.city ?? h.name) : null;
  }

  // Build flat cell array, padded to multiple of 7
  const cells: CalCell[] = [
    ...Array.from({ length: leading }, (): CalCell => ({ type: "empty" })),
    ...Array.from({ length: total }, (_, i): CalCell => {
      const d = i + 1;
      const ds = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return { type: "day", day: d, dateStr: ds };
    }),
  ];
  while (cells.length % 7 !== 0) cells.push({ type: "empty" });

  const rows: CalCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <div className="mb-6 break-inside-avoid">
      <h3 className="mb-2 text-sm font-bold text-zinc-700">{MONTHS_ES[month - 1]} {year}</h3>
      <table className="w-full table-fixed border-collapse text-xs">
        <thead>
          <tr>
            {WEEKDAYS_MON.map((w) => (
              <th key={w} className="border border-zinc-200 bg-zinc-100 p-1 text-center text-[10px] font-semibold text-zinc-500">{w}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                if (cell.type === "empty") {
                  return <td key={ci} className="border border-zinc-200 bg-zinc-50 p-1 align-top" style={{ height: 72 }} />;
                }
                const { day, dateStr: ds } = cell;
                const inTrip = ds >= tripStart && ds <= tripEnd;
                const dayActs = actsByDate.get(ds) ?? [];
                const dayTrans = inTrip ? (transByDate.get(ds) ?? []) : [];
                const city = inTrip ? hotelCity(ds) : null;
                const calItems = [...dayTrans.map((t) => ({ k: "t" as const, t })), ...dayActs.map((a) => ({ k: "a" as const, a }))];
                return (
                  <td
                    key={ds}
                    className={`border border-zinc-200 p-1 align-top text-[10px] ${inTrip ? "bg-white" : "bg-zinc-50"}`}
                    style={{ height: 72 }}
                  >
                    <div className="mb-0.5 flex items-center gap-1 overflow-hidden">
                      <span className={`shrink-0 font-bold ${inTrip ? "text-zinc-800" : "text-zinc-300"}`}>{day}</span>
                      {city && (
                        <span className="truncate rounded px-1 text-[9px] font-semibold" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                          {city}
                        </span>
                      )}
                    </div>
                    {calItems.slice(0, 2).map((item) =>
                      item.k === "t" ? (
                        item.t.isArrival ? (
                          <div
                            key={`${item.t.id}-arr`}
                            className="mb-0.5 truncate rounded px-1 text-[9px]"
                            style={{ background: "#eff6ff", color: "#93c5fd", opacity: 0.7 }}
                          >
                            {PRINT_TRANSPORT_ICONS[item.t.type]} →{item.t.destination}
                          </div>
                        ) : (
                          <div
                            key={item.t.id}
                            className="mb-0.5 truncate rounded px-1 text-[9px]"
                            style={{ background: "#dbeafe", color: "#1e40af" }}
                          >
                            {PRINT_TRANSPORT_ICONS[item.t.type]} {item.t.origin}→{item.t.destination}
                          </div>
                        )
                      ) : (
                        <div
                          key={item.a.id}
                          className="mb-0.5 truncate rounded px-1 text-[9px]"
                          style={isFlightActivity(item.a.title)
                            ? { background: "#e0e7ff", color: "#4338ca" }
                            : { background: "#dcfce7", color: "#15803d" }}
                        >
                          {item.a.title}
                        </div>
                      )
                    )}
                    {calItems.length > 2 && (
                      <div className="text-[9px] text-zinc-400">+{calItems.length - 2} más</div>
                    )}
                    {inTrip && calItems.length === 0 && !city && (
                      <div className="truncate rounded px-1 text-[9px]" style={{ background: "#fef3c7", color: "#b45309" }}>Libre</div>
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
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PrintPage({
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

  const [rawHotels, rawActivities, rawTransports, rawPasses] = await Promise.all([
    prisma.hotel.findMany({
      where: { tripId },
      select: {
        id: true, name: true, city: true, link: true,
        checkInDate: true, checkOutDate: true,
        numberOfNights: true, pricePerNight: true, totalPrice: true,
        currency: true, address: true, notes: true, reserved: true,
      },
      orderBy: { checkInDate: "asc" },
    }),
    prisma.activity.findMany({
      where: { tripId },
      select: {
        id: true, title: true, activityDate: true,
        activityTime: true, location: true, description: true, notes: true,
      },
      orderBy: [{ activityDate: "asc" }, { activityTime: "asc" }],
    }),
    prisma.transport.findMany({
      where: { tripId },
      select: {
        id: true, origin: true, destination: true, type: true,
        departureDate: true, departureTime: true,
        arrivalDate: true, arrivalTime: true,
        cost: true, currency: true, isPaid: true, notes: true, coveredByPassId: true,
      },
      orderBy: [{ departureDate: "asc" }, { departureTime: "asc" }],
    }),
    prisma.pass.findMany({
      where: { tripId },
      select: {
        id: true, name: true, validFrom: true, validTo: true,
        cost: true, currency: true, isPaid: true, notes: true,
        transports: { select: { id: true } },
      },
      orderBy: { validFrom: "asc" },
    }),
  ]);

  const hotels: HotelRow[] = rawHotels.map((h) => ({
    ...h,
    checkInDate: toStr(h.checkInDate),
    checkOutDate: toStr(h.checkOutDate),
    currency: h.currency as string,
  }));

  const activities: ActivityRow[] = rawActivities.map((a) => ({
    ...a,
    activityDate: a.activityDate ? toStr(a.activityDate) : null,
  }));

  const transports: TransportRow[] = rawTransports.map((t) => ({
    ...t,
    departureDate: t.departureDate ? toStr(t.departureDate) : null,
    arrivalDate: t.arrivalDate ? toStr(t.arrivalDate) : null,
    currency: t.currency as string,
  }));

  const passes: PassRow[] = rawPasses.map((p) => ({
    ...p,
    validFrom: p.validFrom ? toStr(p.validFrom) : null,
    validTo: p.validTo ? toStr(p.validTo) : null,
    currency: p.currency as string,
  }));

  const tripStart = trip.startDate ? toStr(trip.startDate) : null;
  const tripEnd   = trip.endDate   ? toStr(trip.endDate)   : null;

  const months = tripStart && tripEnd ? getMonthsInRange(tripStart, tripEnd) : [];

  // Group dated activities by date
  const actsByDate = new Map<string, ActivityRow[]>();
  const undatedActs: ActivityRow[] = [];
  for (const a of activities) {
    if (!a.activityDate) { undatedActs.push(a); continue; }
    if (!actsByDate.has(a.activityDate)) actsByDate.set(a.activityDate, []);
    actsByDate.get(a.activityDate)!.push(a);
  }

  // Group transports by departure date; also add arrival-day entry when date differs
  const transportsByDate = new Map<string, TransportRow[]>();
  for (const t of transports) {
    if (!t.departureDate) continue;
    if (!transportsByDate.has(t.departureDate)) transportsByDate.set(t.departureDate, []);
    transportsByDate.get(t.departureDate)!.push(t);

    if (t.arrivalDate && t.arrivalDate !== t.departureDate) {
      if (!transportsByDate.has(t.arrivalDate)) transportsByDate.set(t.arrivalDate, []);
      transportsByDate.get(t.arrivalDate)!.push({ ...t, isArrival: true });
    }
  }

  // Generate days in trip range for day-by-day section
  const tripDays: string[] = [];
  if (tripStart && tripEnd) {
    let cur = tripStart;
    while (cur <= tripEnd) {
      tripDays.push(cur);
      const d = new Date(cur + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + 1);
      cur = d.toISOString().slice(0, 10);
    }
  }

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
          .print-section-break { page-break-before: always; }
        }
      `}</style>

      <PrintButton />

      <div className="mx-auto max-w-4xl bg-white px-8 py-10 text-zinc-900 print:p-0">

        {/* Header */}
        <div className="mb-8 border-b border-zinc-200 pb-6">
          <h1 className="text-3xl font-bold text-zinc-900">{trip.name}</h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-500">
            {trip.destination && <span>📍 {trip.destination}</span>}
            {tripStart && tripEnd && (
              <span>📅 {fmtShort(tripStart)} – {fmtShort(tripEnd)}</span>
            )}
            {tripStart && tripEnd && (
              <span>⏱ {countNights(tripStart, tripEnd)} días</span>
            )}
          </div>
        </div>

        {/* ── Sección 1: Resumen + Calendario ─────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold uppercase tracking-wider text-zinc-400">
            1. Resumen del viaje
          </h2>

          {/* Route summary */}
          {hotels.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-zinc-600">Ruta de alojamiento</h3>
              <div className="flex flex-wrap items-center gap-2">
                {hotels.map((h, i) => (
                  <div key={h.id} className="flex items-center gap-2">
                    {i > 0 && <span className="text-zinc-400">→</span>}
                    <div className="rounded-lg border border-zinc-200 px-3 py-2">
                      <p className="font-semibold text-zinc-800">{h.city ?? h.name}</p>
                      <p className="text-xs text-zinc-500">
                        {h.numberOfNights} noche{h.numberOfNights !== 1 ? "s" : ""} · {fmtShort(h.checkInDate)} – {fmtShort(h.checkOutDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Calendar */}
          {months.length > 0 && tripStart && tripEnd && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-zinc-600">Vista mensual</h3>
              {months.map(({ year, month }) => (
                <PrintCalendarMonth
                  key={`${year}-${month}`}
                  year={year}
                  month={month}
                  tripStart={tripStart}
                  tripEnd={tripEnd}
                  activities={activities}
                  hotels={hotels}
                  transports={transports}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Sección 2: Detalle de Alojamientos ──────────────────────────────── */}
        <section className="print-section-break mb-10">
          <h2 className="mb-4 text-lg font-bold uppercase tracking-wider text-zinc-400">
            2. Detalle de alojamientos
          </h2>
          {hotels.length === 0 ? (
            <p className="text-sm text-zinc-400">Sin alojamientos registrados.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {hotels.map((h) => (
                <div key={h.id} className="rounded-xl border border-zinc-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-zinc-900">{h.name}</p>
                      {h.city && <p className="text-sm text-zinc-500">📍 {h.city}{h.address ? ` · ${h.address}` : ""}</p>}
                    </div>
                    {h.reserved && (
                      <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Reservado</span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-600">
                    <span>Check-in: <strong>{fmtShort(h.checkInDate)}</strong></span>
                    <span>Check-out: <strong>{fmtShort(h.checkOutDate)}</strong></span>
                    <span>{h.numberOfNights} noche{h.numberOfNights !== 1 ? "s" : ""}</span>
                    {h.pricePerNight && <span>{h.currency} {h.pricePerNight.toLocaleString("es-CL")}/noche</span>}
                    {h.totalPrice && <span>Total: {h.currency} {h.totalPrice.toLocaleString("es-CL")}</span>}
                  </div>
                  {h.notes && <p className="mt-2 text-sm text-zinc-400 italic">{h.notes}</p>}
                  {h.link && <p className="mt-1 text-xs text-blue-500 break-all">{h.link}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Sección 3: Transportes y Pases ──────────────────────────────────── */}
        <section className="print-section-break mb-10">
          <h2 className="mb-4 text-lg font-bold uppercase tracking-wider text-zinc-400">
            3. Transportes y Pases
          </h2>
          {passes.length === 0 && transports.length === 0 ? (
            <p className="text-sm text-zinc-400">Sin transportes registrados.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {passes.map((p) => {
                const coveredLegs = transports.filter((t) => t.coveredByPassId === p.id);
                const coveredValueByCurrency = new Map<string, number>();
                for (const t of coveredLegs) {
                  if (!t.cost) continue;
                  coveredValueByCurrency.set(t.currency, (coveredValueByCurrency.get(t.currency) ?? 0) + t.cost);
                }
                const coveredValueLabel = [...coveredValueByCurrency.entries()]
                  .map(([c, amt]) => `${c} ${amt.toLocaleString("es-CL")}`)
                  .join(" + ");
                return (
                  <div key={p.id} className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-base">📦</span>
                      <p className="font-bold text-blue-800">{p.name}</p>
                      {p.isPaid && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Pagado</span>
                      )}
                    </div>
                    <div className="mb-3 flex flex-wrap gap-4 text-sm text-zinc-600">
                      {p.validFrom && p.validTo && (
                        <span>Válido: {fmtShort(p.validFrom)} – {fmtShort(p.validTo)}</span>
                      )}
                      {p.cost != null && (
                        <span>Costo: {p.currency} {p.cost.toLocaleString("es-CL")}</span>
                      )}
                      {coveredValueLabel && (
                        <span>Valor cubierto: {coveredValueLabel}</span>
                      )}
                    </div>
                    {coveredLegs.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-500">Tramos cubiertos</p>
                        {coveredLegs.map((t) => (
                          <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm">
                            <span>{PRINT_TRANSPORT_ICONS[t.type]}</span>
                            <span className="font-medium text-zinc-800">{t.origin} → {t.destination}</span>
                            {t.departureDate && (
                              <span className="text-xs text-zinc-400">
                                {fmtShort(t.departureDate)}{t.departureTime ? ` ${t.departureTime}` : ""}
                              </span>
                            )}
                            {t.cost != null && (
                              <span className="text-xs text-zinc-400 italic">valor {t.currency} {t.cost.toLocaleString("es-CL")}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {p.notes && <p className="mt-2 text-xs italic text-zinc-400">{p.notes}</p>}
                  </div>
                );
              })}
              {transports.filter((t) => !t.coveredByPassId).length > 0 && (
                <div>
                  {passes.length > 0 && (
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Tramos sin pase</p>
                  )}
                  <div className="flex flex-col gap-2">
                    {transports.filter((t) => !t.coveredByPassId).map((t) => (
                      <div key={t.id} className="rounded-lg border border-zinc-200 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{PRINT_TRANSPORT_ICONS[t.type]}</span>
                          <span className="font-semibold text-zinc-800">{t.origin} → {t.destination}</span>
                          {t.isPaid && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Pagado</span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-zinc-500">
                          {t.departureDate && (
                            <span>Salida: {fmtShort(t.departureDate)}{t.departureTime ? ` ${t.departureTime}` : ""}</span>
                          )}
                          {t.arrivalDate && (
                            <span>Llegada: {fmtShort(t.arrivalDate)}{t.arrivalTime ? ` ${t.arrivalTime}` : ""}</span>
                          )}
                          {t.cost != null && (
                            <span>Costo: {t.currency} {t.cost.toLocaleString("es-CL")}</span>
                          )}
                        </div>
                        {t.notes && <p className="mt-1 text-xs italic text-zinc-400">{t.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Sección 4: Itinerario día a día ─────────────────────────────────── */}
        <section className="print-section-break">
          <h2 className="mb-4 text-lg font-bold uppercase tracking-wider text-zinc-400">
            4. Itinerario día a día
          </h2>

          {tripDays.length === 0 && activities.length === 0 && transports.length === 0 ? (
            <p className="text-sm text-zinc-400">Sin itinerario registrado.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {tripDays.map((ds, idx) => {
                const dayActs = actsByDate.get(ds) ?? [];
                const dayTrans = transportsByDate.get(ds) ?? [];
                const hotel = hotels.find((h) => h.checkInDate <= ds && ds <= h.checkOutDate);
                type DayItem =
                  | { kind: "transport"; t: TransportRow; time: string }
                  | { kind: "activity"; a: ActivityRow; time: string };
                const merged: DayItem[] = [
                  ...dayTrans.map((t) => ({ kind: "transport" as const, t, time: t.isArrival ? (t.arrivalTime ?? "") : (t.departureTime ?? "") })),
                  ...dayActs.map((a) => ({ kind: "activity" as const, a, time: a.activityTime ?? "" })),
                ].sort((x, y) => x.time.localeCompare(y.time));
                return (
                  <div key={ds} className="break-inside-avoid">
                    <div className="flex items-center gap-3 border-b border-zinc-100 pb-1 mb-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-zinc-800 capitalize">{fmtMed(ds)}</p>
                        {hotel && <p className="text-xs text-zinc-400">📍 {hotel.city ?? hotel.name}</p>}
                      </div>
                    </div>
                    {merged.length === 0 ? (
                      <p className="ml-11 text-sm text-zinc-300 italic">Día libre</p>
                    ) : (
                      <div className="ml-11 flex flex-col gap-2">
                        {merged.map((item) =>
                          item.kind === "transport" ? (
                            item.t.isArrival ? (
                              <div key={`${item.t.id}-arr`} className="rounded-lg border border-blue-100 bg-blue-50/30 p-3 opacity-75">
                                <div className="flex flex-wrap items-center gap-2">
                                  {item.t.arrivalTime && (
                                    <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-400 tabular-nums">
                                      {item.t.arrivalTime}
                                    </span>
                                  )}
                                  <span className="text-base">{PRINT_TRANSPORT_ICONS[item.t.type]}</span>
                                  <p className="font-semibold text-blue-500">{item.t.origin} → {item.t.destination}</p>
                                  <span className="rounded border border-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">Llegada</span>
                                </div>
                              </div>
                            ) : (
                            <div key={item.t.id} className="rounded-lg border border-blue-200 bg-blue-50/60 p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                {item.t.departureTime && (
                                  <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-700 tabular-nums">
                                    {item.t.departureTime}
                                  </span>
                                )}
                                <span className="text-base">{PRINT_TRANSPORT_ICONS[item.t.type]}</span>
                                <p className="font-semibold text-blue-800">{item.t.origin} → {item.t.destination}</p>
                                {item.t.coveredByPassId && (
                                  <span className="rounded border border-blue-200 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">📦 pase</span>
                                )}
                              </div>
                              {item.t.arrivalTime && (
                                <p className="mt-1 text-xs text-zinc-500">Llegada: {item.t.arrivalTime}{item.t.arrivalDate && item.t.arrivalDate !== ds ? ` (${fmtShort(item.t.arrivalDate)})` : ""}</p>
                              )}
                              {item.t.notes && <p className="mt-1 text-xs italic text-zinc-400">{item.t.notes}</p>}
                            </div>
                            )
                          ) : (
                            <div key={item.a.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                              <div className="flex items-center gap-2">
                                {item.a.activityTime && (
                                  <span className="shrink-0 rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-bold text-zinc-600 tabular-nums">
                                    {item.a.activityTime}
                                  </span>
                                )}
                                <p className="font-semibold text-zinc-800">{item.a.title}</p>
                              </div>
                              {item.a.location && <p className="mt-1 text-xs text-zinc-500">📍 {item.a.location}</p>}
                              {item.a.description && <p className="mt-1 text-sm text-zinc-600">{item.a.description}</p>}
                              {item.a.notes && <p className="mt-1 text-xs italic text-zinc-400">{item.a.notes}</p>}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {undatedActs.length > 0 && (
                <div className="break-inside-avoid">
                  <div className="flex items-center gap-3 border-b border-zinc-100 pb-1 mb-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600">?</div>
                    <p className="font-semibold text-zinc-500">Sin fecha asignada</p>
                  </div>
                  <div className="ml-11 flex flex-col gap-2">
                    {undatedActs.map((a) => (
                      <div key={a.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                        <p className="font-semibold text-zinc-800">{a.title}</p>
                        {a.location && <p className="mt-1 text-xs text-zinc-500">📍 {a.location}</p>}
                        {a.description && <p className="mt-1 text-sm text-zinc-600">{a.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="mt-12 border-t border-zinc-100 pt-4 text-center text-xs text-zinc-300 print:block">
          Generado con UnkoTrip · {new Date().toLocaleDateString("es-CL")}
        </div>
      </div>
    </>
  );
}
