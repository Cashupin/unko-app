import { prisma } from "@/lib/prisma";
import { EncargosSubtabClient } from "./encargos-subtab-client";
import type { WishlistFriendLink, FriendRequest } from "../types";

type Props = {
  tripId: string;
};

export async function EncargosSubtab({ tripId }: Props) {
  const [rawLinks, rawRequests] = await Promise.all([
    prisma.wishlistFriendLink.findMany({
      where: { tripId },
      select: {
        id: true,
        friendName: true,
        token: true,
        createdByParticipantId: true,
        createdAt: true,
        revokedAt: true,
        _count: { select: { requests: { where: { requestStatus: "PENDING" } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.wishlistItem.findMany({
      where: {
        tripId,
        friendLinkId: { not: null },
        requestStatus: { not: null },
      },
      select: {
        id: true,
        name: true,
        notes: true,
        imageUrl: true,
        requestStatus: true,
        createdAt: true,
        bought: true,
        boughtAt: true,
        cost: true,
        friendLink: { select: { friendName: true } },
        friendLinkId: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const links: WishlistFriendLink[] = rawLinks.map((l) => ({
    id: l.id,
    tripId,
    friendName: l.friendName,
    token: l.token,
    createdByParticipantId: l.createdByParticipantId,
    createdAt: l.createdAt.toISOString(),
    revokedAt: l.revokedAt?.toISOString() ?? null,
    pendingCount: l._count.requests,
  }));

  const requests: FriendRequest[] = rawRequests.map((r) => ({
    id: r.id,
    name: r.name,
    notes: r.notes,
    imageUrl: r.imageUrl,
    requestStatus: r.requestStatus as FriendRequest["requestStatus"],
    createdAt: r.createdAt.toISOString(),
    friendName: r.friendLink?.friendName ?? "",
    friendLinkId: r.friendLinkId!,
    bought: r.bought,
    boughtAt: r.boughtAt?.toISOString() ?? null,
    cost: r.cost ?? null,
  }));

  return (
    <EncargosSubtabClient
      tripId={tripId}
      initialLinks={links}
      initialRequests={requests}
    />
  );
}
