import { prisma } from "@/lib/prisma";
import type { ItemType } from "@/generated/prisma/client";
import { ItemsMapCollapsible } from "@/modules/proposals/components/items-map-collapsible";

export async function ItemsMapServer({
  tripId,
  typeFilter,
  proposerFilter,
  search,
  cityFilter,
}: {
  tripId: string;
  typeFilter?: string;
  proposerFilter?: string;
  search?: string;
  cityFilter?: string;
}) {
  const createdByIdFilter =
    proposerFilter === "none" ? null : proposerFilter || undefined;

  const items = await prisma.item.findMany({
    where: {
      tripId,
      locationLat: { not: null },
      locationLng: { not: null },
      type: typeFilter ? (typeFilter as ItemType) : undefined,
      createdById: createdByIdFilter,
      city: cityFilter ? { equals: cityFilter } : undefined,
      OR: search
        ? [
            { title: { contains: search, mode: "insensitive" } },
            { location: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    select: {
      id: true,
      title: true,
      type: true,
      location: true,
      imageUrl: true,
      locationLat: true,
      locationLng: true,
      city: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const mapItems = items.map((i) => ({
    id: i.id,
    title: i.title,
    type: i.type,
    location: i.location,
    imageUrl: i.imageUrl,
    locationLat: i.locationLat!,
    locationLng: i.locationLng!,
    city: i.city,
  }));

  return <ItemsMapCollapsible items={mapItems} selectedCity={cityFilter ?? null} />;
}
