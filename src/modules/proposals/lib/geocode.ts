import { unstable_cache } from "next/cache";

type PhotonResponse = {
  features?: {
    properties?: {
      city?: string;
      town?: string;
      village?: string;
      district?: string;
      suburb?: string;
      county?: string;
      state?: string;
    };
  }[];
};

const fetchCity = unstable_cache(
  async (lat: string, lng: string): Promise<string | null> => {
    try {
      const res = await fetch(
        `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&limit=1&lang=en`,
        { headers: { "Accept-Language": "en" } },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as PhotonResponse;
      const props = data.features?.[0]?.properties;
      return (
        props?.city ??
        props?.town ??
        props?.village ??
        props?.district ??
        props?.suburb ??
        props?.county ??
        props?.state ??
        null
      );
    } catch {
      return null;
    }
  },
  ["photon-reverse-geocode-v3"],
  { revalidate: 60 },
);

export async function enrichItemsWithCity<T extends { locationLat: number; locationLng: number }>(
  items: T[],
): Promise<(T & { city: string | null })[]> {
  const coordGroups = new Map<string, { lat: number; lng: number }>();
  for (const item of items) {
    const key = `${item.locationLat.toFixed(2)},${item.locationLng.toFixed(2)}`;
    if (!coordGroups.has(key)) {
      coordGroups.set(key, { lat: item.locationLat, lng: item.locationLng });
    }
  }

  const cityByKey = new Map<string, string | null>();
  await Promise.all(
    [...coordGroups.entries()].map(async ([key, { lat, lng }]) => {
      cityByKey.set(key, await fetchCity(String(lat), String(lng)));
    }),
  );

  return items.map((item) => {
    const key = `${item.locationLat.toFixed(2)},${item.locationLng.toFixed(2)}`;
    return { ...item, city: cityByKey.get(key) ?? null };
  });
}

export function computeCityCounts(
  items: { city: string | null }[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const city = item.city ?? "Otra";
    counts[city] = (counts[city] ?? 0) + 1;
  }
  return counts;
}
