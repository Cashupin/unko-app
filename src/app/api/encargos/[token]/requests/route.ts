import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotificationMany } from "@/modules/notifications/lib/notifications";
import { broadcast } from "@/lib/supabase-broadcast";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const link = await prisma.wishlistFriendLink.findUnique({
    where: { token },
    select: {
      id: true,
      tripId: true,
      friendName: true,
      revokedAt: true,
      trip: {
        select: {
          participants: {
            where: { user: { isNot: null } },
            select: { userId: true },
          },
        },
      },
    },
  });

  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (link.revokedAt) return NextResponse.json({ error: "Revoked" }, { status: 410 });

  const body = await req.json();
  const { name, notes, imageUrl } = body as { name: string; notes?: string; imageUrl?: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const item = await prisma.wishlistItem.create({
    data: {
      tripId: link.tripId,
      name: name.trim(),
      notes: notes?.trim() || null,
      imageUrl: imageUrl || null,
      requestStatus: "PENDING",
      friendLinkId: link.id,
    },
    select: { id: true, name: true, createdAt: true },
  });

  // Notificar a todos los participantes del viaje
  const userIds = link.trip.participants.map((p) => p.userId!).filter(Boolean);
  if (userIds.length > 0) {
    await createNotificationMany(
      userIds.map((userId) => ({
        userId,
        type: "WISHLIST_REQUEST" as const,
        title: `${link.friendName} pidió un encargo`,
        body: item.name,
        link: `/trips/${link.tripId}?tab=wishlist&wishlistSubtab=encargos`,
      }))
    );
  }

  broadcast(`trip:${link.tripId}`, "update", {
    type: "wishlist_request",
    actorName: link.friendName,
    itemName: item.name,
  });

  return NextResponse.json({
    ...item,
    requestStatus: "PENDING",
    createdAt: item.createdAt.toISOString(),
  });
}
