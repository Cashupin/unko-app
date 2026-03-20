import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { DeleteActivityButton } from "@/components/delete-activity-button";
import { CreateActivityForm } from "@/components/create-activity-form";
import { EditActivityForm } from "@/components/edit-activity-form";
import { PhotoThumbnail } from "@/components/ui/photo-thumbnail";
import { getMapsUrl } from "@/lib/maps-url";
import { PastDaysCollapsible } from "@/components/past-days-collapsible";
import { CreateItemFromActivityButton } from "@/components/create-item-from-activity-button";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
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
    dateLabel: date.toLocaleDateString("es-CL", {
      day: "numeric",
      month: "long",
    }),
  };
}

function avatarBg(str: string): string {
  const colors = [
    "#7c3aed", "#0891b2", "#b45309", "#be123c",
    "#16a34a", "#dc2626", "#d97706", "#2563eb",
    "#9333ea", "#0d9488",
  ];
  let hash = 0;
  for (const c of str) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[hash % colors.length];
}

type Participant = {
  userId: string | null;
  name: string;
  user: { id: string; image: string | null } | null;
};

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
  item: {
    id: string;
    title: string;
    imageUrl: string | null;
    address: string | null;
    checks: { userId: string; user: { id: string; name: string | null; image: string | null } }[];
  } | null;
};

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
  const today = todayDateStr();

  const [activities, hotels, participants] = await Promise.all([
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
        item: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            address: true,
            checks: {
              select: {
                userId: true,
                user: { select: { id: true, name: true, image: true } },
              },
            },
          },
        },
      },
      orderBy: [{ activityDate: "asc" }, { activityTime: "asc" }, { createdAt: "asc" }],
    }),
    prisma.hotel.findMany({
      where: { tripId },
      select: { id: true, name: true, checkInDate: true, checkOutDate: true },
      orderBy: { checkInDate: "asc" },
    }),
    prisma.tripParticipant.findMany({
      where: { tripId, type: "REGISTERED" },
      select: {
        userId: true,
        name: true,
        user: { select: { id: true, image: true } },
      },
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

  function hotelsForDay(dateStr: string): HotelForItinerary[] {
    return hotels.filter((h) => {
      const checkIn = toDateStr(new Date(h.checkInDate));
      const checkOut = toDateStr(new Date(h.checkOutDate));
      return checkIn <= dateStr && dateStr <= checkOut;
    });
  }

  const dateRange =
    startDate && endDate ? generateDateRange(startDate, endDate) : [];

  const outOfRangeDates = [...byDate.keys()]
    .filter((d) => !dateRange.includes(d))
    .sort();

  const allDates = [...dateRange, ...outOfRangeDates];

  const pastDates = allDates.filter((d) => d < today);
  const currentAndFutureDates = allDates.filter((d) => d >= today);

  const hasAnything = activities.length > 0 || dateRange.length > 0;

  if (!hasAnything) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-zinc-200 p-14 text-center dark:border-[#27272a]">
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          No hay actividades todavía. ¡Agrega la primera!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Past days — collapsed by default */}
      <PastDaysCollapsible count={pastDates.length}>
        {pastDates.map((dateStr) => (
          <DayCard
            key={dateStr}
            dateStr={dateStr}
            acts={byDate.get(dateStr) ?? []}
            hotels={hotelsForDay(dateStr)}
            tripId={tripId}
            canEdit={canEdit}
            isToday={false}
            isPast={true}
            participants={participants}
          />
        ))}
      </PastDaysCollapsible>

      {/* Current + future days */}
      {currentAndFutureDates.map((dateStr) => (
        <div key={dateStr} id={`day-${dateStr}`}>
          <DayCard
            dateStr={dateStr}
            acts={byDate.get(dateStr) ?? []}
            hotels={hotelsForDay(dateStr)}
            tripId={tripId}
            canEdit={canEdit}
            isToday={dateStr === today}
            isPast={false}
            participants={participants}
          />
        </div>
      ))}

      {/* No-date activities */}
      {noDateActivities.length > 0 && (
        <div className="rounded-2xl border border-[#27272a] bg-[#18191c] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-[#27272a] md:px-5 md:py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-[#27272a]">
                <span className="text-xs font-bold text-zinc-500">—</span>
              </div>
              <p className="text-sm font-semibold text-zinc-300">Sin fecha</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 p-3">
            {noDateActivities.map((act) => (
              <ActivityRow
                key={act.id}
                act={act}
                tripId={tripId}
                canEdit={canEdit}
                participants={participants}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Day card ─────────────────────────────────────────────────────────────────

function DayCard({
  dateStr,
  acts,
  hotels,
  tripId,
  canEdit,
  isToday,
  isPast,
  participants,
}: {
  dateStr: string;
  acts: Activity[];
  hotels: HotelForItinerary[];
  tripId: string;
  canEdit: boolean;
  isToday: boolean;
  isPast: boolean;
  participants: Participant[];
}) {
  const { dayNum, weekday, dateLabel } = parseDateHeader(dateStr);
  const isEmpty = acts.length === 0;

  return (
    <div
      className={`rounded-2xl border overflow-hidden ${
        isToday
          ? "border-violet-500/35 bg-[rgba(139,92,246,0.03)]"
          : "border-[#27272a] bg-[#18191c]"
      } ${isPast ? "opacity-70" : ""}`}
    >
      {/* Card header */}
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3.5 border-b md:px-5 md:py-4 ${
          isToday ? "border-violet-500/20" : "border-[#27272a]"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Day badge */}
          <div
            className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl ${
              isToday
                ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
                : isPast
                ? "bg-[#27272a] text-zinc-500"
                : "bg-zinc-100 text-zinc-900"
            }`}
          >
            <span className="text-[8.5px] font-bold leading-none tracking-widest opacity-65 uppercase">
              {weekday}
            </span>
            <span className="text-[17px] font-extrabold leading-tight">{dayNum}</span>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-200 flex flex-wrap items-center gap-2">
              {dateLabel}
              {isToday && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-violet-500/15 text-violet-400 border border-violet-500/25 rounded-full px-2 py-0.5">
                  Hoy
                </span>
              )}
            </p>
            {!isEmpty && (
              <p className="text-xs font-medium text-zinc-500">
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
                  href={`/trips/${tripId}?tab=itinerario&hotelId=${hotels[0].id}`}
                  className="flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
                >
                  <span>🏨</span>
                  <span className="max-w-28 truncate">{hotels[0].name}</span>
                </a>
              ) : (
                <div className="flex items-center gap-1">
                  {hotels.map((h, i) => (
                    <span key={h.id} className="flex items-center gap-1">
                      {i > 0 && <span className="text-zinc-600 text-xs">→</span>}
                      <a
                        href={`/trips/${tripId}?tab=itinerario&hotelId=${h.id}`}
                        className="flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
                      >
                        {i === 0 && <span>🏨</span>}
                        <span className="max-w-20 truncate">{h.name}</span>
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
          <p className="text-sm font-medium text-zinc-600">☀️ Día libre</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-3">
          {acts.map((act) => (
            <ActivityRow
              key={act.id}
              act={act}
              tripId={tripId}
              canEdit={canEdit}
              participants={participants}
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
  participants,
}: {
  act: Activity;
  tripId: string;
  canEdit: boolean;
  participants: Participant[];
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

  const checkedUserIds = new Set(act.item?.checks.map((c) => c.userId) ?? []);
  const showCheckins = !!act.item && participants.length > 0;

  return (
    <div className="group flex items-start gap-3 bg-[#1f2023] rounded-xl px-4 py-3.5 border border-transparent hover:border-[#3f3f46] transition-colors">
      {/* Time badge */}
      <div className="w-12 shrink-0 pt-0.5">
        {act.activityTime && (
          <div className="rounded-lg bg-[#27272a] px-1.5 py-1.5 text-center">
            <span className="text-xs font-bold tabular-nums text-zinc-300">
              {act.activityTime}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-zinc-100 text-sm leading-snug">
          {act.title}
        </p>

        {act.item ? (
          <a
            href={`/trips/${tripId}?tab=actividades#item-${act.item.id}`}
            className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-500/12 border border-violet-500/20 px-2 py-0.5 text-[10.5px] font-semibold text-violet-400 hover:bg-violet-500/20 transition-colors"
          >
            ↗ Ver propuesta
          </a>
        ) : canEdit && (
          <CreateItemFromActivityButton
            tripId={tripId}
            activity={{
              id: act.id,
              title: act.title,
              description: act.description,
              location: act.location,
              locationLat: act.locationLat,
              locationLng: act.locationLng,
            }}
          />
        )}

        {act.description && (
          <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">
            {act.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-3">
          {act.location && (
            <a
              href={getMapsUrl(act.location, act.locationLat, act.locationLng)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <span>📍</span>
              {act.location}
            </a>
          )}
          {!act.location && act.item?.address && (
            <a
              href={getMapsUrl(act.item.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <span>📍</span>
              {act.item.address}
            </a>
          )}
          {!act.location && !act.item?.address && act.locationLat && act.locationLng && (
            <a
              href={getMapsUrl("", act.locationLat, act.locationLng)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-mono font-medium text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <span>📍</span>
              {act.locationLat.toFixed(5)}, {act.locationLng.toFixed(5)}
            </a>
          )}
          {act.notes && (
            <span className="text-xs text-zinc-500 italic">{act.notes}</span>
          )}
        </div>

        {/* Check-in row — only for activities linked to a proposal */}
        {showCheckins && (
          <CheckinRow participants={participants} checkedUserIds={checkedUserIds} />
        )}
      </div>

      {/* Right: photo + actions */}
      {act.photoUrl ? (
        <div className="flex shrink-0 flex-col items-center gap-1.5 self-start pt-0.5">
          {canEdit && (
            <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <EditActivityForm tripId={tripId} activity={activityForEdit} />
              <DeleteActivityButton tripId={tripId} activityId={act.id} />
            </div>
          )}
          <PhotoThumbnail url={act.photoUrl} alt={act.title} />
        </div>
      ) : act.item?.imageUrl ? (
        <div className="flex shrink-0 flex-col items-center gap-1.5 self-start pt-0.5">
          {canEdit && (
            <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <EditActivityForm tripId={tripId} activity={activityForEdit} />
              <DeleteActivityButton tripId={tripId} activityId={act.id} />
            </div>
          )}
          <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-[#27272a]">
            <Image src={act.item.imageUrl} alt={act.title} fill className="object-cover" />
          </div>
        </div>
      ) : canEdit ? (
        <div className="flex shrink-0 items-center gap-1 self-start pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <EditActivityForm tripId={tripId} activity={activityForEdit} />
          <DeleteActivityButton tripId={tripId} activityId={act.id} />
        </div>
      ) : null}
    </div>
  );
}

// ─── Check-in row ─────────────────────────────────────────────────────────────

const MAX_AVATARS = 5;

function CheckinRow({
  participants,
  checkedUserIds,
}: {
  participants: Participant[];
  checkedUserIds: Set<string>;
}) {
  const checkedCount = participants.filter(
    (p) => p.userId && checkedUserIds.has(p.userId)
  ).length;
  const total = participants.length;
  const visible = participants.slice(0, MAX_AVATARS);
  const allChecked = checkedCount === total && total > 0;

  return (
    <div className="mt-2.5 pt-2.5 border-t border-[#27272a] flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 shrink-0">
        Check-in
      </span>
      <div className="flex items-center">
        {visible.map((p, i) => {
          const checked = !!p.userId && checkedUserIds.has(p.userId);
          const initial = p.name[0]?.toUpperCase() ?? "?";
          return (
            <div
              key={i}
              title={`${p.name}${checked ? " ✓" : ""}`}
              className="w-5 h-5 rounded-full border-2 border-[#1f2023] flex items-center justify-center text-[8px] font-bold text-white shrink-0"
              style={{
                marginLeft: i > 0 ? "-5px" : undefined,
                background: checked ? avatarBg(p.userId ?? p.name) : "#3f3f46",
              }}
            >
              {checked ? initial : ""}
            </div>
          );
        })}
        {participants.length > MAX_AVATARS && (
          <div
            className="w-5 h-5 rounded-full border-2 border-[#1f2023] bg-[#27272a] flex items-center justify-center text-[7px] font-bold text-zinc-400"
            style={{ marginLeft: "-5px" }}
          >
            +{participants.length - MAX_AVATARS}
          </div>
        )}
      </div>
      <span
        className={`text-[11px] font-medium ml-1 ${
          allChecked
            ? "text-emerald-400"
            : checkedCount === 0
            ? "text-zinc-600"
            : "text-zinc-400"
        }`}
      >
        {allChecked
          ? "✓ Todos fueron"
          : checkedCount === 0
          ? "Aún nadie fue"
          : `${checkedCount}/${total} fueron`}
      </span>
    </div>
  );
}
