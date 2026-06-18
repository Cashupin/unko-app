import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── POST /api/items/[id]/comments/seen ────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: itemId } = await params;
  const userId = session.user.id;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, tripId: true },
  });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId: item.tripId, userId },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.itemCommentView.upsert({
    where: { userId_itemId: { userId, itemId } },
    create: { userId, itemId },
    update: { lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
