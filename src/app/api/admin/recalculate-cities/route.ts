import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { geocodeCity } from "@/modules/proposals/lib/geocode";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// GET /api/admin/recalculate-cities?tripId=xxx
// Only accessible to ADMIN members of the trip.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tripId = req.nextUrl.searchParams.get("tripId");
  if (!tripId) {
    return NextResponse.json({ error: "tripId required" }, { status: 400 });
  }

  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId, userId: session.user.id },
    select: { role: true },
  });

  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await prisma.item.findMany({
    where: {
      tripId,
      locationLat: { not: null },
      locationLng: { not: null },
      city: null,
    },
    select: { id: true, locationLat: true, locationLng: true },
  });

  let updated = 0;
  for (const item of items) {
    const city = await geocodeCity(item.locationLat!, item.locationLng!);
    if (city) {
      await prisma.item.update({ where: { id: item.id }, data: { city } });
      updated++;
    }
    await sleep(1100);
  }

  return NextResponse.json({
    total: items.length,
    updated,
    skipped: items.length - updated,
  });
}
