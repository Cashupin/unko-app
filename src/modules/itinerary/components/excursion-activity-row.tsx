import Image from "next/image";
import { EditActivityForm } from "@/modules/itinerary/components/edit-activity-form";
import { DeleteActivityButton } from "@/modules/itinerary/components/delete-activity-button";
import { PhotoThumbnail } from "@/components/ui/photo-thumbnail";
import { getMapsUrl } from "@/lib/maps-url";

type ExcursionActivityItem = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  activityDate: string | null;
  activityTime: string | null;
  notes: string | null;
  photoUrl: string | null;
  isDraft: boolean;
  item: {
    id: string;
    title: string;
    imageUrl: string | null;
    address: string | null;
  } | null;
  tickets: { id: string; isPurchased: boolean }[];
};

export function ExcursionActivityRow({
  act,
  tripId,
  canEdit,
  isAdmin,
}: {
  act: ExcursionActivityItem;
  tripId: string;
  canEdit: boolean;
  isAdmin: boolean;
}) {
  const activityForEdit = {
    id: act.id,
    title: act.title,
    description: act.description,
    location: act.location,
    locationLat: act.locationLat,
    locationLng: act.locationLng,
    activityDate: act.activityDate,
    activityTime: act.activityTime,
    notes: act.notes,
    photoUrl: act.photoUrl,
  };

  return (
    <div
      className={`group flex items-start gap-3 rounded-xl px-4 py-3.5 border border-dashed transition-colors ${
        act.isDraft
          ? "bg-indigo-950/20 border-indigo-500/25 hover:border-indigo-500/45"
          : "bg-[#1f2023] border-transparent hover:border-[#3f3f46]"
      }`}
    >
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
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <p className="font-semibold text-zinc-100 text-sm leading-snug">{act.title}</p>
          {act.isDraft && (
            <span className="inline-flex items-center rounded-full border border-dashed border-indigo-500/50 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-400">
              Borrador
            </span>
          )}
          {act.tickets.length > 0 && (
            <a
              href={`/trips/${tripId}?tab=itinerario&subtab=entradas`}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                act.tickets.every((t) => t.isPurchased)
                  ? "border-emerald-700/50 bg-emerald-900/20 text-emerald-400"
                  : "border-amber-700/50 bg-amber-900/20 text-amber-400"
              }`}
            >
              🎟️{" "}
              {act.tickets.every((t) => t.isPurchased)
                ? "Entrada comprada"
                : "Entrada pendiente"}
            </a>
          )}
          {act.item && (
            <a
              href={`/trips/${tripId}?tab=actividades#item-${act.item.id}`}
              className="inline-flex items-center gap-1 rounded-full bg-violet-500/12 border border-violet-500/20 px-2 py-0.5 text-[10.5px] font-semibold text-violet-400 hover:bg-violet-500/20 transition-colors"
            >
              ↗ Ver propuesta
            </a>
          )}
        </div>

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
          {act.notes && (
            <span className="text-xs text-zinc-500 italic">{act.notes}</span>
          )}
        </div>
      </div>

      {/* Right: photo + actions */}
      {act.photoUrl ? (
        <div className="flex shrink-0 flex-col items-center gap-1.5 self-start pt-0.5">
          {canEdit && (
            <div className="flex items-center justify-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <EditActivityForm
                tripId={tripId}
                activity={activityForEdit}
                overlayZIndex="z-[70]"
              />
              {!act.isDraft && isAdmin && (
                <DeleteActivityButton tripId={tripId} activityId={act.id} />
              )}
            </div>
          )}
          <PhotoThumbnail url={act.photoUrl} alt={act.title} />
        </div>
      ) : act.item?.imageUrl ? (
        <div className="flex shrink-0 flex-col items-center gap-1.5 self-start pt-0.5">
          {canEdit && (
            <div className="flex items-center justify-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <EditActivityForm
                tripId={tripId}
                activity={activityForEdit}
                overlayZIndex="z-[70]"
              />
              {!act.isDraft && isAdmin && (
                <DeleteActivityButton tripId={tripId} activityId={act.id} />
              )}
            </div>
          )}
          <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-[#27272a]">
            <Image
              src={act.item.imageUrl}
              alt={act.title}
              fill
              className="object-cover"
            />
          </div>
        </div>
      ) : canEdit ? (
        <div className="flex shrink-0 items-center gap-1 self-start pt-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <EditActivityForm
            tripId={tripId}
            activity={activityForEdit}
            overlayZIndex="z-[70]"
          />
          {!act.isDraft && isAdmin && (
            <DeleteActivityButton tripId={tripId} activityId={act.id} />
          )}
        </div>
      ) : null}
    </div>
  );
}
