import { prisma } from "@/lib/prisma";
import { WishlistClient } from "./wishlist-client";
import type { WishlistItem } from "../types";

type Props = {
  tripId: string;
  myParticipantId: string;
  canEdit: boolean;
};

export async function WishlistView({ tripId, myParticipantId, canEdit }: Props) {
  const [rawItems, participants] = await Promise.all([
    prisma.wishlistItem.findMany({
      where: { tripId },
      select: {
        id: true,
        tripId: true,
        name: true,
        notes: true,
        imageUrl: true,
        bought: true,
        boughtAt: true,
        originItemId: true,
        createdAt: true,
        ownedByParticipantId: true,
        ownedByParticipant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tripParticipant.findMany({
      where: { tripId },
      select: { id: true, name: true },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  const items: WishlistItem[] = rawItems.map((i) => ({
    id: i.id,
    tripId: i.tripId,
    name: i.name,
    notes: i.notes,
    imageUrl: i.imageUrl,
    bought: i.bought,
    boughtAt: i.boughtAt?.toISOString() ?? null,
    originItemId: i.originItemId,
    createdAt: i.createdAt.toISOString(),
    ownedByParticipantId: i.ownedByParticipantId,
    ownedByParticipant: i.ownedByParticipant,
  }));

  return (
    <WishlistClient
      tripId={tripId}
      myParticipantId={myParticipantId}
      canEdit={canEdit}
      initialItems={items}
      participants={participants}
    />
  );
}
