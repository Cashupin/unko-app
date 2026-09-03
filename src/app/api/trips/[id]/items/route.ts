import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId } = await params;

  const participant = await prisma.tripParticipant.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!participant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await prisma.item.findMany({
    where: { tripId },
    select: {
      id: true,
      title: true,
      type: true,
      imageUrl: true,
      location: true,
      description: true,
      locationLat: true,
      locationLng: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ items });
}
