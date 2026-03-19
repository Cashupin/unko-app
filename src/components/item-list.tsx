import { prisma } from "@/lib/prisma";
import type { ItemType } from "@/generated/prisma/client";
import { ItemCardWithModal, type ItemCardData } from "@/components/item-card-modal";
import type { ItemSummary } from "@/types/item";

export async function ItemList({
  currentUserId,
  tripId,
  isAdmin = false,
  tripStartDate,
  tripEndDate,
  typeFilter,
  search,
}: {
  currentUserId: string;
  tripId: string;
  isAdmin?: boolean;
  tripStartDate?: Date | null;
  tripEndDate?: Date | null;
  typeFilter?: string;
  search?: string;
}) {
  const [rawItems, registeredParticipants] = await Promise.all([
    prisma.item.findMany({
      where: {
        tripId,
        type: typeFilter ? (typeFilter as ItemType) : undefined,
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
        externalUrl: true,
        imageUrl: true,
        tripId: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true, image: true } },
        _count: { select: { checks: true } },
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
        activities: { select: { id: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tripParticipant.count({
      where: { tripId, type: "REGISTERED", user: { status: "ACTIVE" } },
    }),
  ]);

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
    const isOwner = raw.createdBy.id === currentUserId;
    const otherVoteCount = raw.votes.filter((v) => v.userId !== raw.createdBy.id).length;
    const hasMajority = approvals >= required;
    const myVote =
      (raw.votes.find((v) => v.userId === currentUserId)?.value as "APPROVE" | "REJECT" | undefined) ??
      null;
    const myRawCheck = raw.checks.find((c) => c.userId === currentUserId);

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
      externalUrl: raw.externalUrl,
      imageUrl: raw.imageUrl,
      tripId: raw.tripId,
      createdAt: raw.createdAt,
      createdBy: raw.createdBy,
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
      createdByName: raw.createdBy.name,
      createdByImage: raw.createdBy.image,
      approvals,
      rejections,
      checksCount: raw._count.checks,
      status,
      myVote,
      myCheck: myRawCheck ? { id: myRawCheck.id, photoUrl: myRawCheck.photoUrl } : null,
      votes: raw.votes.map((v) => ({
        value: v.value as "APPROVE" | "REJECT",
        userName: v.user?.name ?? null,
        userImage: v.user?.image ?? null,
      })),
      checks: raw.checks.map(({ id, photoUrl, user }) => ({ id, photoUrl, userName: user?.name ?? null })),
      canEdit: (isOwner && otherVoteCount === 0) || isAdmin,
      canDelete: isOwner || isAdmin,
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
