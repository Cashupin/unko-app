import { prisma } from "@/lib/prisma";
import { DeleteActivityButton } from "@/components/delete-activity-button";
import { CreateActivityForm } from "@/components/create-activity-form";
import { EditActivityForm } from "@/components/edit-activity-form";
import { PhotoThumbnail } from "@/components/photo-thumbnail";
import { getMapsUrl } from "@/lib/maps-url";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function generateDateRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  let current = toDateStr(start);
  const endStr = toDateStr(end);
  while (current <= endStr) {
    dates.push(current);
    const d = new Date(current + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1);
    current = d.toISOString().slice(0, 10);
  }
  return dates;
}

function parseDateHeader(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    dayNum: d,
    weekday: date
      .toLocaleDateString("es-CL", { weekday: "short" })
      .replace(".", "")
      .toUpperCase(),
    monthYear: date.toLocaleDateString("es-CL", {
      month: "long",
      year: "numeric",
    }),
  };
}

type HotelForItinerary = {
  id: string;
  name: string;
  checkInDate: Date;
  checkOutDate: Date;
};

export async function ActivityList({
  tripId,
  canEdit,
  startDate,
  endDate,
}: {
  tripId: string;
  canEdit: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
}) {
  const [activities, hotels] = await Promise.all([
    prisma.activity.findMany({
      where: { tripId },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        locationLat: true,
        locationLng: true,
        activityDate: true,
        activityTime: true,
        notes: true,
        photoUrl: true,
        createdAt: true,
        item: { select: { id: true, title: true } },
      },
      orderBy: [{ activityDate: "asc" }, { activityTime: "asc" }, { createdAt: "asc" }],
    }),
    prisma.hotel.findMany({
      where: { tripId },
      select: { id: true, name: true, checkInDate: true, checkOutDate: true },
      orderBy: { checkInDate: "asc" },
    }),
  ]);

  const byDate = new Map<string, typeof activities>();
  const noDateActivities: typeof activities = [];

  for (const act of activities) {
    if (act.activityDate) {
      const key = toDateStr(new Date(act.activityDate));
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(act);
    } else {
      noDateActivities.push(act);
    }
  }

  // Build hotels-per-day lookup (checkIn <= day <= checkOut)
  function hotelsForDay(dateStr: string): HotelForItinerary[] {
    return hotels.filter((h) => {
      const checkIn = toDateStr(new Date(h.checkInDate));
      const checkOut = toDateStr(new Date(h.checkOutDate));
      return checkIn <= dateStr && dateStr <= checkOut;
    });
  }

  const dateRange =
    startDate && endDate ? generateDateRange(startDate, endDate) : [];

  const outOfRangeDates = [...byDate.keys()].filter(
    (d) => !dateRange.includes(d)
  );
  outOfRangeDates.sort();

  const hasAnything = activities.length > 0 || dateRange.length > 0;

  if (!hasAnything) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white/60 p-14 text-center dark:border-zinc-700 dark:bg-zinc-800/60">
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          No hay actividades todavía. ¡Agrega la primera!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {dateRange.map((dateStr) => (
        <DayCard
          key={dateStr}
          dateStr={dateStr}
          acts={byDate.get(dateStr) ?? []}
          hotels={hotelsForDay(dateStr)}
          tripId={tripId}
          canEdit={canEdit}
        />
      ))}

      {outOfRangeDates.map((dateStr) => (
        <DayCard
          key={dateStr}
          dateStr={dateStr}
          acts={byDate.get(dateStr) ?? []}
          hotels={hotelsForDay(dateStr)}
          tripId={tripId}
          canEdit={canEdit}
        />
      ))}

      {noDateActivities.length > 0 && (
        <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm ring-1 ring-black/3 overflow-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:ring-white/5">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-zinc-100 md:px-5 md:py-4 dark:border-zinc-700">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-700">
                <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">—</span>
              </div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Sin fecha</p>
            </div>
          </div>
          {/* Activities */}
          <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
            {noDateActivities.map((act) => (
              <ActivityRow
                key={act.id}
                act={act}
                tripId={tripId}
                canEdit={canEdit}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Day card ─────────────────────────────────────────────────────────────────

type Activity = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  activityDate: Date | null;
  activityTime: string | null;
  notes: string | null;
  photoUrl: string | null;
  createdAt: Date;
  item: { id: string; title: string } | null;
};

function DayCard({
  dateStr,
  acts,
  hotels,
  tripId,
  canEdit,
}: {
  dateStr: string;
  acts: Activity[];
  hotels: HotelForItinerary[];
  tripId: string;
  canEdit: boolean;
}) {
  const { dayNum, weekday, monthYear } = parseDateHeader(dateStr);
  const isEmpty = acts.length === 0;

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm ring-1 ring-black/3 overflow-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:ring-white/5">
      {/* Card header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-zinc-100 md:px-5 md:py-4 dark:border-zinc-700">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            <span className="text-[9px] font-semibold leading-none tracking-widest opacity-60">
              {weekday}
            </span>
            <span className="text-base font-bold leading-tight">{dayNum}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-800 capitalize dark:text-zinc-200">
              {monthYear}
            </p>
            {!isEmpty && (
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {acts.length} actividad{acts.length !== 1 ? "es" : ""}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hotels.length > 0 && (
            <div className="flex items-center gap-1">
              {hotels.length === 1 ? (
                <a
                  href={`/trips/${tripId}?tab=hoteles&hotelId=${hotels[0].id}`}
                  className="flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors dark:bg-blue-950 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/60"
                >
                  <span>🏨</span>
                  <span className="max-w-30 truncate">
                    {hotels[0].name}
                  </span>
                </a>
              ) : (
                <div className="flex items-center gap-1">
                  {hotels.map((h, i) => (
                    <span key={h.id} className="flex items-center gap-1">
                      {i > 0 && <span className="text-zinc-300 dark:text-zinc-600 text-xs">→</span>}
                      <a
                        href={`/trips/${tripId}?tab=hoteles&hotelId=${h.id}`}
                        className="flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors dark:bg-blue-950 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/60"
                      >
                        {i === 0 && <span>🏨</span>}
                        <span className="max-w-20 truncate">
                          {h.name}
                        </span>
                      </a>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {canEdit && (
            <CreateActivityForm tripId={tripId} defaultDate={dateStr} compact />
          )}
        </div>
      </div>

      {/* Body */}
      {isEmpty ? (
        <div className="flex items-center justify-center px-5 py-10">
          <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">☀️ Día libre</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
          {acts.map((act) => (
            <ActivityRow
              key={act.id}
              act={act}
              tripId={tripId}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Activity row ─────────────────────────────────────────────────────────────

function ActivityRow({
  act,
  tripId,
  canEdit,
}: {
  act: Activity;
  tripId: string;
  canEdit: boolean;
}) {
  const activityForEdit = {
    id: act.id,
    title: act.title,
    description: act.description,
    location: act.location,
    locationLat: act.locationLat,
    locationLng: act.locationLng,
    activityDate: act.activityDate ? toDateStr(new Date(act.activityDate)) : null,
    activityTime: act.activityTime,
    notes: act.notes,
    photoUrl: act.photoUrl,
  };

  return (
    <div className="group flex items-start gap-3 px-4 py-3.5 md:gap-4 md:px-5 md:py-4">
      {/* Time badge */}
      <div className="w-14 shrink-0 pt-0.5">
        {act.activityTime && (
          <div className="rounded-lg bg-zinc-900 px-2 py-1.5 text-center dark:bg-zinc-100">
            <span className="text-xs font-semibold tabular-nums text-white dark:text-zinc-900">
              {act.activityTime}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-zinc-900 text-sm leading-snug dark:text-zinc-100">
          {act.title}
        </p>
        {act.item && (
          <span className="mt-0.5 inline-block rounded-full bg-violet-50 border border-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-950 dark:border-violet-900 dark:text-violet-400">
            {act.item.title}
          </span>
        )}
        {act.description && (
          <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">
            {act.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {act.location && (
            <a
              href={getMapsUrl(act.location, act.locationLat, act.locationLng)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <span>📍</span>
              {act.location}
            </a>
          )}
          {act.notes && (
            <span className="text-xs text-zinc-500 italic dark:text-zinc-400">{act.notes}</span>
          )}
        </div>
      </div>

      {/* Right side: photo with action overlay, or plain action buttons */}
      {act.photoUrl ? (
        <div className="flex shrink-0 flex-col items-center gap-1.5 self-start pt-0.5">
          {canEdit && (
            <div className="flex items-center justify-center gap-0.5">
              <EditActivityForm tripId={tripId} activity={activityForEdit} />
              <DeleteActivityButton tripId={tripId} activityId={act.id} />
            </div>
          )}
          <PhotoThumbnail url={act.photoUrl} alt={act.title} />
        </div>
      ) : canEdit ? (
        <div className="flex shrink-0 items-center gap-1 self-start pt-0.5">
          <EditActivityForm tripId={tripId} activity={activityForEdit} />
          <DeleteActivityButton tripId={tripId} activityId={act.id} />
        </div>
      ) : null}
    </div>
  );
}
