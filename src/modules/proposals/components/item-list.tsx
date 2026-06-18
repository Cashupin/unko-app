import { prisma } from "@/lib/prisma";
import type { ItemType } from "@/generated/prisma/client";
import { ItemCardWithModal, type ItemCardData } from "@/modules/proposals/components/item-card-modal";
import type { ItemSummary } from "@/modules/proposals/types/item";

export async function ItemList({
  currentUserId,
  tripId,
  isAdmin = false,
  canMutate = false,
  tripStartDate,
  tripEndDate,
  typeFilter,
  search,
  proposerFilter,
  cityFilter,
}: {
  currentUserId: string;
  tripId: string;
  isAdmin?: boolean;
  canMutate?: boolean;
  tripStartDate?: Date | null;
  tripEndDate?: Date | null;
  typeFilter?: string;
  search?: string;
  proposerFilter?: string;
  cityFilter?: string;
}) {
  const createdByIdFilter = proposerFilter === "none"
    ? null
    : proposerFilter
      ? proposerFilter
      : undefined;

  const [rawItems, registeredParticipants, tripParticipants, myCommentViews] = await Promise.all([
    prisma.item.findMany({
      where: {
        tripId,
        type: typeFilter ? (typeFilter as ItemType) : undefined,
        createdById: createdByIdFilter,
        city: cityFilter ? { equals: cityFilter } : undefined,
        OR: search
          ? [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
              { address: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      select: {
        id: true,
        title: true,
        type: true,
        description: true,
        location: true,
        locationLat: true,
        locationLng: true,
        address: true,
        city: true,
        externalUrl: true,
        imageUrl: true,
        tripId: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true, image: true } },
        _count: { select: { checks: true, comments: true } },
        votes: {
          select: {
            userId: true,
            value: true,
            user: { select: { name: true, image: true } },
          },
        },
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
        comments: {
          select: {
            id: true,
            text: true,
            createdAt: true,
            userId: true,
            user: { select: { name: true, image: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        activities: { select: { id: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tripParticipant.count({
      where: { tripId, type: "REGISTERED", user: { status: "ACTIVE" } },
    }),
    prisma.tripParticipant.findMany({
      where: { tripId, type: "REGISTERED", user: { status: "ACTIVE" } },
      select: { userId: true, name: true },
    }),
    prisma.itemCommentView.findMany({
      where: { userId: currentUserId, item: { tripId } },
      select: { itemId: true, lastSeenAt: true },
    }),
  ]);

  const lastSeenByItemId = new Map(myCommentViews.map((v) => [v.itemId, v.lastSeenAt]));
  const required = Math.floor(registeredParticipants / 2) + 1;

  if (rawItems.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[#2d2d31] bg-[#1f2023]/60 p-14 text-center">
        <p className="text-sm text-zinc-500">No hay actividades todavía. ¡Agrega la primera!</p>
      </div>
    );
  }

  const items: ItemCardData[] = rawItems.map((raw) => {
    const approvals = raw.votes.filter((v) => v.value === "APPROVE").length;
    const rejections = raw.votes.filter((v) => v.value === "REJECT").length;
    const isOwner = raw.createdBy?.id === currentUserId;
    const otherVoteCount = raw.votes.filter((v) => v.userId !== raw.createdBy?.id).length;
    const hasOwner = raw.createdBy !== null;
    const hasMajority = approvals >= required;
    const myVote =
      (raw.votes.find((v) => v.userId === currentUserId)?.value as "APPROVE" | "REJECT" | undefined) ??
      null;
    const myRawCheck = raw.checks.find((c) => c.userId === currentUserId);
    const lastSeenAt = lastSeenByItemId.get(raw.id) ?? null;
    const unreadCommentsCount = raw.comments.filter(
      (c) => c.userId !== currentUserId && (!lastSeenAt || c.createdAt > lastSeenAt),
    ).length;

    const status: "APPROVED" | "PENDING" | "REJECTED" =
      approvals >= required ? "APPROVED" : rejections >= required ? "REJECTED" : "PENDING";

    const itemSummary: ItemSummary = {
      id: raw.id,
      title: raw.title,
      type: raw.type as "PLACE" | "FOOD",
      description: raw.description,
      location: raw.location,
      locationLat: raw.locationLat,
      locationLng: raw.locationLng,
      address: raw.address,
      city: raw.city,
      externalUrl: raw.externalUrl,
      imageUrl: raw.imageUrl,
      tripId: raw.tripId,
      createdAt: raw.createdAt,
      createdById: raw.createdBy?.id ?? null,
      createdBy: raw.createdBy ?? null,
      _count: raw._count,
      approvals,
      rejections,
      myVote,
      myCheck: myRawCheck
        ? { id: myRawCheck.id, photoUrl: myRawCheck.photoUrl, userName: myRawCheck.user?.name ?? null }
        : null,
      checks: raw.checks.map(({ id, photoUrl, user }) => ({ id, photoUrl, userName: user?.name ?? null })),
      inItinerary: raw.activities.length > 0,
    };

    return {
      id: raw.id,
      title: raw.title,
      type: raw.type as "PLACE" | "FOOD",
      description: raw.description,
      location: raw.location,
      locationLat: raw.locationLat,
      locationLng: raw.locationLng,
      address: raw.address,
      externalUrl: raw.externalUrl,
      imageUrl: raw.imageUrl,
      tripId: raw.tripId,
      createdAt: raw.createdAt.toISOString(),
      createdById: raw.createdBy?.id ?? null,
      createdByName: raw.createdBy?.name ?? null,
      createdByImage: raw.createdBy?.image ?? null,
      approvals,
      rejections,
      checksCount: raw._count.checks,
      commentsCount: raw._count.comments,
      unreadCommentsCount,
      status,
      myVote,
      myCheck: myRawCheck ? { id: myRawCheck.id, photoUrl: myRawCheck.photoUrl, userName: myRawCheck.user?.name ?? null } : null,
      votes: raw.votes.map((v) => ({
        value: v.value as "APPROVE" | "REJECT",
        userName: v.user?.name ?? null,
        userImage: v.user?.image ?? null,
      })),
      checks: raw.checks.map(({ id, photoUrl, user }) => ({ id, photoUrl, userName: user?.name ?? null })),
      comments: raw.comments.map((c) => ({
        id: c.id,
        text: c.text,
        createdAt: c.createdAt.toISOString(),
        userId: c.userId,
        userName: c.user?.name ?? null,
        userImage: c.user?.image ?? null,
      })),
      canEdit: (isOwner && otherVoteCount === 0) || isAdmin,
      canDelete: isOwner || isAdmin,
      canClaim: !hasOwner && canMutate && !isAdmin,
      isAdmin,
      currentUserId,
      participants: tripParticipants.map((p) => ({ id: p.userId!, name: p.name })),
      inItinerary: raw.activities.length > 0,
      canAddToItinerary: isAdmin || hasMajority,
      tripStartDate: tripStartDate ? tripStartDate.toISOString() : null,
      tripEndDate: tripEndDate ? tripEndDate.toISOString() : null,
      itemSummary,
    };
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <ItemCardWithModal key={item.id} item={item} />
      ))}
    </div>
  );
}
