import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getMembership(tripId: string, userId: string) {
  return prisma.tripParticipant.findFirst({
    where: { tripId, userId },
    select: { id: true, role: true },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId } = await params;
  const member = await getMembership(tripId, session.user.id!);
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const links = await prisma.wishlistFriendLink.findMany({
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
  });

  return NextResponse.json(
    links.map((l) => ({
      id: l.id,
      friendName: l.friendName,
      token: l.token,
      createdByParticipantId: l.createdByParticipantId,
      createdAt: l.createdAt.toISOString(),
      revokedAt: l.revokedAt?.toISOString() ?? null,
      pendingCount: l._count.requests,
    }))
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId } = await params;
  const member = await getMembership(tripId, session.user.id!);
  if (!member || member.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { friendName } = await req.json() as { friendName: string };
  if (!friendName?.trim()) {
    return NextResponse.json({ error: "friendName required" }, { status: 400 });
  }

  const link = await prisma.wishlistFriendLink.create({
    data: {
      tripId,
      friendName: friendName.trim(),
      createdByParticipantId: member.id,
    },
    select: {
      id: true,
      friendName: true,
      token: true,
      createdByParticipantId: true,
      createdAt: true,
      revokedAt: true,
    },
  });

  return NextResponse.json({
    ...link,
    createdAt: link.createdAt.toISOString(),
    revokedAt: null,
    pendingCount: 0,
  });
}
