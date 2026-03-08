import Image from "next/image";
import { prisma } from "@/lib/prisma";
import type { ItemType, ItemStatus } from "@/generated/prisma/client";
import { CheckInButton } from "@/components/check-in-button";
import { VoteButtons } from "@/components/vote-buttons";
import { AddToItineraryButton } from "@/components/add-to-itinerary-button";
import { DeleteItemButton } from "@/components/delete-item-button";
import { EditItemForm } from "@/components/edit-item-form";
import { PhotoThumbnail } from "@/components/photo-thumbnail";
import { getMapsUrl } from "@/lib/maps-url";
import type { ItemSummary } from "@/types/item";

// ─── Labels / colors ───────────────────────────────────────────────────────────

const TYPE_LABELS = { PLACE: "Lugar", FOOD: "Comida" } as const;
const TYPE_COLORS = {
  PLACE: "bg-blue-100 text-blue-700",
  FOOD: "bg-orange-100 text-orange-700",
} as const;
const STATUS_COLORS = {
  PENDING: "bg-zinc-100 text-zinc-600",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
} as const;
const STATUS_LABELS = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
} as const;

// ─── Item Card ─────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  required,
  isOwner,
  isAdmin,
  canEdit,
  tripId,
  tripStartDate,
  tripEndDate,
}: {
  item: ItemSummary;
  required: number;
  isOwner: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  tripId: string;
  tripStartDate?: Date | null;
  tripEndDate?: Date | null;
}) {
  const canDelete = isOwner || isAdmin;

  return (
    <div id={`item-${item.id}`} className="group rounded-2xl border border-zinc-100 bg-white shadow-sm ring-1 ring-black/3 hover:shadow-md hover:border-zinc-200 transition-all flex flex-col overflow-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:ring-white/5 dark:hover:border-zinc-700">
      {/* Cover image / placeholder */}
      {item.imageUrl ? (
        <div className="relative h-40 w-full">
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div
          className={`flex h-40 w-full items-center justify-center ${
            item.type === "FOOD"
              ? "bg-linear-to-br from-orange-400 to-amber-600"
              : "bg-linear-to-br from-blue-500 to-indigo-700"
          }`}
        >
          <span className="text-5xl opacity-80 drop-shadow-sm select-none">
            {item.type === "FOOD" ? "🍽️" : "🏛️"}
          </span>
        </div>
      )}

      <div className="p-5 flex flex-col flex-1 gap-0">
        {/* Title + badges */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="font-semibold text-zinc-900 leading-snug dark:text-zinc-100">
            {item.title}
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[item.type]}`}
            >
              {TYPE_LABELS[item.type]}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status]}`}
            >
              {STATUS_LABELS[item.status]}
            </span>
            {(canEdit || canDelete) && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              {canEdit && (
                <EditItemForm item={item} />
              )}
              {canDelete && (
                <DeleteItemButton itemId={item.id} />
              )}
            </div>
          )}
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <p className="mb-3 text-sm text-zinc-500 line-clamp-2 dark:text-zinc-400">
            {item.description}
          </p>
        )}

        {/* Location */}
        {item.location && (
          <a
            href={getMapsUrl(item.location, item.locationLat, item.locationLng)}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            📍 {item.location}
          </a>
        )}

        {/* External link */}
        {item.externalUrl && (
          <a
            href={item.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 block text-xs text-blue-600 underline underline-offset-2 truncate dark:text-blue-400"
          >
            {item.externalUrl}
          </a>
        )}

        {/* Stats row */}
        <div className="mt-auto flex items-center gap-3 border-t border-zinc-100 pt-3 text-xs text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
          {item.status !== "PENDING" && (
            <span>
              ✓ {item.approvals} · ✗ {item.rejections}
            </span>
          )}
          {item.status === "APPROVED" && (
            <span>
              · {item._count.checks} visita
              {item._count.checks !== 1 ? "s" : ""}
            </span>
          )}
          <span className="ml-auto">
            {new Date(item.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Author */}
        <div className="mt-2 flex items-center gap-2">
          {item.createdBy.image && (
            <Image
              src={item.createdBy.image}
              alt={item.createdBy.name ?? ""}
              width={18}
              height={18}
              className="rounded-full"
            />
          )}
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {item.createdBy.name ?? item.createdBy.id}
          </span>
        </div>

        {/* Vote buttons — only for PENDING items that the user didn't create */}
        {item.status === "PENDING" && (
          <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-700">
            {isOwner ? (
              <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
                ✓ Tu voto de aprobación se registró al crear el ítem
              </p>
            ) : (
              <VoteButtons
                itemId={item.id}
                myVote={item.myVote}
                approvals={item.approvals}
                rejections={item.rejections}
                required={required}
              />
            )}
          </div>
        )}

        {/* Check-in photos from all users */}
        {item.status === "APPROVED" && item.checks.some((c) => c.photoUrl) && (
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {item.checks
              .filter((c) => c.photoUrl)
              .map((c) => (
                <div key={c.id} className="flex flex-col items-center gap-1 shrink-0">
                  <PhotoThumbnail url={c.photoUrl!} alt={`Foto de ${c.userName ?? "visita"}`} />
                  {c.userName && (
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-16 text-center">
                      {c.userName}
                    </span>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* APPROVED actions: check-in + add to itinerary */}
        {item.status === "APPROVED" && (
          <div className="mt-3 border-t border-zinc-100 pt-3 flex items-center justify-between gap-2 dark:border-zinc-700">
            <CheckInButton itemId={item.id} myCheck={item.myCheck} />
            <AddToItineraryButton
              tripId={tripId}
              itemId={item.id}
              title={item.title}
              tripStartDate={tripStartDate}
              tripEndDate={tripEndDate}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Item List (Server Component) ─────────────────────────────────────────────

export async function ItemList({
  currentUserId,
  tripId,
  isAdmin = false,
  tripStartDate,
  tripEndDate,
  typeFilter,
  statusFilter,
  search,
}: {
  currentUserId: string;
  tripId: string;
  isAdmin?: boolean;
  tripStartDate?: Date | null;
  tripEndDate?: Date | null;
  typeFilter?: string;
  statusFilter?: string;
  search?: string;
}) {
  const [rawItems, registeredParticipants] = await Promise.all([
    prisma.item.findMany({
      where: {
        tripId,
        type: typeFilter ? (typeFilter as ItemType) : undefined,
        status: statusFilter ? (statusFilter as ItemStatus) : undefined,
        OR: search
          ? [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        description: true,
        location: true,
        locationLat: true,
        locationLng: true,
        externalUrl: true,
        imageUrl: true,
        tripId: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: { id: true, name: true, image: true },
        },
        _count: {
          select: { checks: true },
        },
        // All votes — used to compute approvals, rejections, and myVote
        votes: {
          select: { userId: true, value: true },
        },
        // All check-ins (latest 20) — used for the photo gallery and to derive myCheck
        checks: {
          select: {
            id: true,
            photoUrl: true,
            userId: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Threshold is based on REGISTERED active participants of this trip
    prisma.tripParticipant.count({
      where: { tripId, type: "REGISTERED", user: { status: "ACTIVE" } },
    }),
  ]);

  const required = Math.floor(registeredParticipants / 2) + 1;

  const items: (ItemSummary & { canEdit: boolean })[] = rawItems.map((item) => {
    const myRawCheck = item.checks.find((c) => c.userId === currentUserId);
    const isOwner = item.createdBy.id === currentUserId;
    const otherVoteCount = item.votes.filter((v) => v.userId !== item.createdBy.id).length;
    return {
      ...item,
      approvals: item.votes.filter((v) => v.value === "APPROVE").length,
      rejections: item.votes.filter((v) => v.value === "REJECT").length,
      myVote:
        (item.votes.find((v) => v.userId === currentUserId)?.value as
          | "APPROVE"
          | "REJECT"
          | undefined) ?? null,
      myCheck: myRawCheck
        ? { id: myRawCheck.id, photoUrl: myRawCheck.photoUrl, userName: myRawCheck.user?.name ?? null }
        : null,
      checks: item.checks.map(({ id, photoUrl, user }) => ({ id, photoUrl, userName: user?.name ?? null })),
      canEdit: (isOwner && otherVoteCount === 0) || isAdmin,
    };
  });

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white/60 p-14 text-center dark:border-zinc-700 dark:bg-zinc-800/60">
        <p className="text-sm text-zinc-400 dark:text-zinc-500">No hay actividades todavía. ¡Agrega la primera!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          required={required}
          isOwner={item.createdBy.id === currentUserId}
          isAdmin={isAdmin}
          canEdit={item.canEdit}
          tripId={tripId}
          tripStartDate={tripStartDate}
          tripEndDate={tripEndDate}
        />
      ))}
    </div>
  );
}
