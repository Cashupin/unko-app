import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId, itemId } = await params;

  const member = await prisma.tripParticipant.findFirst({
    where: { tripId, userId: session.user.id! },
    select: { id: true, role: true, name: true },
  });
  if (!member || member.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const item = await prisma.wishlistItem.findFirst({
    where: { id: itemId, tripId, requestStatus: "PENDING" },
    select: { id: true, name: true },
  });
  if (!item) return NextResponse.json({ error: "Not found or not pending" }, { status: 404 });

  const updated = await prisma.wishlistItem.update({
    where: { id: itemId },
    data: { requestStatus: "REJECTED" },
    select: { id: true, requestStatus: true },
  });

  broadcast(`trip:${tripId}`, "update", {
    type: "wishlist",
    actorId: member.id,
    actorName: member.name,
    action: "rejected",
    itemName: item.name,
  });

  return NextResponse.json(updated);
}
