import { prisma } from "@/lib/prisma";
import { NearbyActivities } from "@/components/nearby-activities";

export async function NearbyActivitiesServer({
  tripId,
  alwaysOpen = false,
  expandable = false,
  itemsHref,
}: {
  tripId: string;
  alwaysOpen?: boolean;
  expandable?: boolean;
  itemsHref?: string;
}) {
  const [items, activities] = await Promise.all([
    prisma.item.findMany({
      where: { tripId },
      select: {
        id: true,
        title: true,
        type: true,
        location: true,
        locationLat: true,
        locationLng: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    // Activities with coords that are NOT already linked to an item (avoids duplicates)
    prisma.activity.findMany({
      where: { tripId, itemId: null, locationLat: { not: null }, locationLng: { not: null } },
      select: {
        id: true,
        title: true,
        location: true,
        locationLat: true,
        locationLng: true,
        activityDate: true,
      },
    }),
  ]);

  const combined = [
    ...items.map((i) => ({ ...i, sourceType: "item" as const, activityDate: null })),
    ...activities.map((a) => ({
      id: a.id,
      title: a.title,
      type: "ACTIVITY",
      location: a.location,
      locationLat: a.locationLat,
      locationLng: a.locationLng,
      sourceType: "activity" as const,
      activityDate: a.activityDate ? a.activityDate.toISOString().slice(0, 10) : null,
    })),
  ];

  return (
    <NearbyActivities
      items={combined}
      tripId={tripId}
      alwaysOpen={alwaysOpen}
      expandable={expandable}
      itemsHref={itemsHref}
    />
  );
}
