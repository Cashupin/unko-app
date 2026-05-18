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

export async function geocodeCity(lat: number, lng: number): Promise<string | null> {
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
