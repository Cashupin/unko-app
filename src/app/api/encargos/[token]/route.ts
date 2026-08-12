import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const link = await prisma.wishlistFriendLink.findUnique({
    where: { token },
    select: {
      id: true,
      friendName: true,
      revokedAt: true,
      trip: { select: { id: true, name: true, destination: true } },
      requests: {
        select: {
          id: true,
          name: true,
          notes: true,
          imageUrl: true,
          requestStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (link.revokedAt) return NextResponse.json({ error: "Revoked" }, { status: 410 });

  return NextResponse.json({
    friendName: link.friendName,
    trip: link.trip,
    requests: link.requests.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
