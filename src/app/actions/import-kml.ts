"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type ImportKmlItem = {
  name: string;
  description?: string;
  lat?: number;
  lng?: number;
  location?: string;
  type: "PLACE" | "FOOD";
  imageUrl?: string | null;
};

export type ImportKmlResult = {
  imported: number;
  errors: { name: string; reason: string }[];
};

async function reverseGeocodeAddress(lat: number, lng: number): Promise<string | null> {
  try {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lng), lang: "en" });
    const res = await fetch(`https://photon.komoot.io/reverse?${params}`, {
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: { properties?: { name?: string; city?: string; state?: string; country?: string } }[];
    };
    const p = data.features?.[0]?.properties;
    if (!p) return null;
    return [p.name, p.city, p.state, p.country].filter(Boolean).join(", ") || null;
  } catch {
    return null;
  }
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type ExistingItemStub = {
  title: string;
  locationLat: number | null;
  locationLng: number | null;
};

export async function getTripItemsForDedup(tripId: string): Promise<ExistingItemStub[]> {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    throw new Error("No autorizado");
  }
  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId, userId: session.user.id },
    select: { role: true },
  });
  if (!membership || membership.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return prisma.item.findMany({
    where: { tripId },
    select: { title: true, locationLat: true, locationLng: true },
  });
}

export async function importKmlItems(
  tripId: string,
  items: ImportKmlItem[],
): Promise<ImportKmlResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    throw new Error("No autorizado");
  }
  const userId = session.user.id;

  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId, userId },
    select: { role: true },
  });
  if (!membership || membership.role !== "ADMIN") {
    throw new Error("Solo los administradores pueden importar ítems");
  }

  // Load existing items for dedup
  const existing = await prisma.item.findMany({
    where: { tripId },
    select: { title: true, locationLat: true, locationLng: true },
  });

  const errors: { name: string; reason: string }[] = [];
  let imported = 0;

  for (const item of items) {
    try {
      // Dedup by exact name (case-insensitive)
      const nameDup = existing.find(
        (e) => e.title.toLowerCase() === item.name.toLowerCase(),
      );
      if (nameDup) {
        errors.push({ name: item.name, reason: "Ya existe un ítem con ese nombre" });
        continue;
      }

      // Dedup by coordinates within 50 m
      if (item.lat != null && item.lng != null) {
        const coordDup = existing.find(
          (e) =>
            e.locationLat != null &&
            e.locationLng != null &&
            haversineMeters(item.lat!, item.lng!, e.locationLat, e.locationLng) <
              50,
        );
        if (coordDup) {
          errors.push({
            name: item.name,
            reason: `Ya existe un ítem cercano ("${coordDup.title}")`,
          });
          continue;
        }
      }

      const address =
        item.lat != null && item.lng != null
          ? await reverseGeocodeAddress(item.lat, item.lng)
          : null;

      await prisma.item.create({
        data: {
          title: item.name,
          type: item.type,
          description: item.description ?? null,
          location: item.location ?? null,
          locationLat: item.lat ?? null,
          locationLng: item.lng ?? null,
          address,
          externalUrl: null,
          imageUrl: item.imageUrl ?? null,
          createdById: userId,
          tripId,
        },
      });

      // Add to in-memory existing list so subsequent items in this batch dedup against it
      existing.push({
        title: item.name,
        locationLat: item.lat ?? null,
        locationLng: item.lng ?? null,
      });
      imported++;
    } catch (err) {
      errors.push({
        name: item.name,
        reason: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  return { imported, errors };
}
