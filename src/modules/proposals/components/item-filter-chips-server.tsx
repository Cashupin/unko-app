import { prisma } from "@/lib/prisma";
import type { ItemType } from "@/generated/prisma/client";
import { computeCityCounts } from "@/modules/proposals/lib/geocode";
import { ItemFilterChips } from "@/modules/proposals/components/item-filter-chips";

export async function ItemFilterChipsServer({
  tripId,
  typeFilter,
  proposerFilter,
  search,
  participants,
}: {
  tripId: string;
  typeFilter?: string;
  proposerFilter?: string;
  search?: string;
  participants?: { id: string; name: string }[];
}) {
  const createdByIdFilter =
    proposerFilter === "none" ? null : proposerFilter || undefined;

  // Lightweight query — only city field, same filters as map/list (except city itself)
  const cityItems = await prisma.item.findMany({
    where: {
      tripId,
      city: { not: null },
      locationLat: { not: null },
      locationLng: { not: null },
      type: typeFilter ? (typeFilter as ItemType) : undefined,
      createdById: createdByIdFilter,
      OR: search
        ? [
            { title: { contains: search, mode: "insensitive" } },
            { location: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    select: { city: true },
  });

  const cityCounts = computeCityCounts(cityItems);

  return <ItemFilterChips participants={participants} cityCounts={cityCounts} />;
}
