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
  const items = await prisma.item.findMany({
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
  });

  return <NearbyActivities items={items} alwaysOpen={alwaysOpen} expandable={expandable} itemsHref={itemsHref} />;
}
