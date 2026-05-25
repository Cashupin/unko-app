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

// ─── Print Calendar Month ─────────────────────────────────────────────────────

function isFlightActivity(title: string): boolean {
  const l = title.toLowerCase();
  return l.includes("vuelo") || l.includes("flight") || l.includes("->") || l.includes("→") ||
    l.includes("aeropuerto") || l.includes("salida") || l.includes("llegada");
}

type CalCell = { type: "empty" } | { type: "day"; day: number; dateStr: string };

function PrintCalendarMonth({
  year, month, tripStart, tripEnd, activities, hotels,
}: {
  year: number; month: number;
  tripStart: string; tripEnd: string;
  activities: ActivityRow[]; hotels: HotelRow[];
}) {
  const leading = firstWeekdayMonStart(year, month);
  const total   = daysInMonth(year, month);

  const actsByDate = new Map<string, ActivityRow[]>();
  for (const a of activities) {
    if (!a.activityDate) continue;
    if (!actsByDate.has(a.activityDate)) actsByDate.set(a.activityDate, []);
    actsByDate.get(a.activityDate)!.push(a);
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
                const city = inTrip ? hotelCity(ds) : null;
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
                    {dayActs.slice(0, 2).map((a) => (
                      <div
                        key={a.id}
                        className="mb-0.5 truncate rounded px-1 text-[9px]"
                        style={isFlightActivity(a.title)
                          ? { background: "#e0e7ff", color: "#4338ca" }
                          : { background: "#dcfce7", color: "#15803d" }}
                      >
                        {a.title}
                      </div>
                    ))}
                    {dayActs.length > 2 && (
                      <div className="text-[9px] text-zinc-400">+{dayActs.length - 2} más</div>
                    )}
                    {inTrip && dayActs.length === 0 && !city && (
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

  const [rawHotels, rawActivities] = await Promise.all([
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

        {/* ── Sección 3: Itinerario día a día ─────────────────────────────────── */}
        <section className="print-section-break">
          <h2 className="mb-4 text-lg font-bold uppercase tracking-wider text-zinc-400">
            3. Itinerario día a día
          </h2>

          {tripDays.length === 0 && activities.length === 0 ? (
            <p className="text-sm text-zinc-400">Sin itinerario registrado.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {tripDays.map((ds, idx) => {
                const dayActs = actsByDate.get(ds) ?? [];
                const hotel = hotels.find((h) => h.checkInDate <= ds && ds <= h.checkOutDate);
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
                    {dayActs.length === 0 ? (
                      <p className="ml-11 text-sm text-zinc-300 italic">Día libre</p>
                    ) : (
                      <div className="ml-11 flex flex-col gap-2">
                        {dayActs.map((a) => (
                          <div key={a.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                            <div className="flex items-center gap-2">
                              {a.activityTime && (
                                <span className="shrink-0 rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-bold text-zinc-600 tabular-nums">
                                  {a.activityTime}
                                </span>
                              )}
                              <p className="font-semibold text-zinc-800">{a.title}</p>
                            </div>
                            {a.location && <p className="mt-1 text-xs text-zinc-500">📍 {a.location}</p>}
                            {a.description && <p className="mt-1 text-sm text-zinc-600">{a.description}</p>}
                            {a.notes && <p className="mt-1 text-xs italic text-zinc-400">{a.notes}</p>}
                          </div>
                        ))}
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
