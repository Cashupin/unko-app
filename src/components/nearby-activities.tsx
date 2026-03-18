"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getMapsUrl } from "@/lib/maps-url";

export type NearbyItem = {
  id: string;
  title: string;
  type: string;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  sourceType?: "item" | "activity";
  activityDate?: string | null;
};

type NearbyItemWithDistance = NearbyItem & { distance: number };

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

function distanceColor(km: number): string {
  if (km < 0.5) return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
  if (km < 2) return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  return "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400";
}

const TYPE_ICONS: Record<string, string> = { PLACE: "🏛️", FOOD: "🍜", ACTIVITY: "📅" };

const PAGE_SIZE = 5;

export function NearbyActivities({
  items,
  tripId,
  itemsHref,
  alwaysOpen = false,
  expandable = false,
  viewAllHref,
}: {
  items: NearbyItem[];
  tripId?: string;
  /** When provided, "Ver →" navigates to this URL with #item-{id} hash */
  itemsHref?: string;
  /** When true, panel is always expanded and cannot be collapsed */
  alwaysOpen?: boolean;
  /** When true, shows a "Ver más" button to load more items beyond the first 5 */
  expandable?: boolean;
  /** When provided, shows a "Ver todas" link in the header */
  viewAllHref?: string;
}) {
  const [collapsed, setCollapsed] = useState(!alwaysOpen);
  const [radius, setRadius] = useState(5);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<
    "idle" | "loading" | "ready" | "denied" | "unavailable" | "timeout" | "unsupported"
  >("idle");

  // Hydrate from localStorage after mount (only when collapsible)
  useEffect(() => {
    if (!alwaysOpen) {
      const savedCollapsed = localStorage.getItem("nearby-collapsed");
      if (savedCollapsed !== null) setCollapsed(savedCollapsed !== "false");
    }
    const savedRadius = localStorage.getItem("nearby-radius");
    if (savedRadius !== null) setRadius(Number(savedRadius));
  }, [alwaysOpen]);

  useEffect(() => {
    if (!alwaysOpen) {
      localStorage.setItem("nearby-collapsed", String(collapsed));
    }
  }, [collapsed, alwaysOpen]);


  // Request geolocation when expanded
  useEffect(() => {
    if (collapsed || geoStatus !== "idle") return;
    if (!navigator.geolocation) {
      setGeoStatus("unsupported");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("ready");
      },
      (err) => {
        if (err.code === 1) setGeoStatus("denied");
        else if (err.code === 3) setGeoStatus("timeout");
        else setGeoStatus("unavailable");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  }, [collapsed, geoStatus]);

  // Reset visible count when radius changes so the list starts fresh
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [radius]);

  const itemsWithCoords = items.filter((i) => i.locationLat != null && i.locationLng != null);

  const nearbyItems: NearbyItemWithDistance[] =
    userPos && geoStatus === "ready"
      ? itemsWithCoords
          .map((item) => ({
            ...item,
            distance: haversineKm(userPos.lat, userPos.lng, item.locationLat!, item.locationLng!),
          }))
          .filter((item) => item.distance <= radius)
          .sort((a, b) => a.distance - b.distance)
      : [];

  function scrollToItem(id: string) {
    const el = document.getElementById(`item-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Flash highlight: ring appears instantly, fades out after 1.5s
    el.style.transition = "box-shadow 0.1s ease-in";
    el.style.boxShadow = "0 0 0 3px rgb(113 113 122 / 0.7), 0 0 0 6px rgb(113 113 122 / 0.15)";
    setTimeout(() => {
      el.style.transition = "box-shadow 0.8s ease-out";
      el.style.boxShadow = "";
    }, 3000);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm ring-1 ring-black/3 dark:border-zinc-700 dark:bg-zinc-800 dark:ring-white/5">
      {/* Header — collapsible or static depending on alwaysOpen */}
      {alwaysOpen ? (
        <div className="flex items-center gap-2.5 px-4 py-3.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-sm dark:bg-zinc-700">
            📍
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cerca de ti</p>
            {geoStatus === "ready" && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {nearbyItems.length} {nearbyItems.length === 1 ? "actividad" : "actividades"} en {radius} km
              </p>
            )}
          </div>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="shrink-0 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              Ver todas →
            </Link>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            const next = !collapsed;
            setCollapsed(next);
            if (!next) {
              setGeoStatus("idle");
              setUserPos(null);
            }
          }}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-sm dark:bg-zinc-700">
              📍
            </span>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cerca de ti</p>
              {collapsed && geoStatus !== "ready" && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Toca para ver actividades cercanas</p>
              )}
              {geoStatus === "ready" && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  {nearbyItems.length} {nearbyItems.length === 1 ? "actividad" : "actividades"} en {radius} km
                </p>
              )}
            </div>
          </div>
          <svg
            className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform dark:text-zinc-500 ${collapsed ? "" : "rotate-180"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* Expanded content */}
      {!collapsed && (
        <div className="border-t border-zinc-100 dark:border-zinc-700">
          {/* Radius slider */}
          <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-700">
            <span className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">Radio</span>
            <input
              type="range"
              min={1}
              max={50}
              value={radius}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRadius(val);
                localStorage.setItem("nearby-radius", String(val));
              }}
              className="flex-1 accent-zinc-700 dark:accent-zinc-300"
            />
            <span className="w-14 shrink-0 rounded-lg bg-zinc-100 px-2 py-0.5 text-right text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
              {radius} km
            </span>
          </div>

          {/* Status messages */}
          {geoStatus === "loading" && (
            <div className="flex items-center gap-2 px-4 py-4">
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms] dark:bg-zinc-500" />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms] dark:bg-zinc-500" />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms] dark:bg-zinc-500" />
              <span className="text-sm text-zinc-400 dark:text-zinc-500">Obteniendo ubicación...</span>
            </div>
          )}
          {geoStatus === "denied" && (
            <p className="px-4 py-4 text-sm text-zinc-400 dark:text-zinc-500">
              Permiso de ubicación denegado. Habilítalo en la configuración del navegador.
            </p>
          )}
          {geoStatus === "unavailable" && (
            <p className="px-4 py-4 text-sm text-zinc-400 dark:text-zinc-500">
              No se pudo obtener la ubicación. Verifica tu conexión o señal GPS.
            </p>
          )}
          {geoStatus === "timeout" && (
            <p className="px-4 py-4 text-sm text-zinc-400 dark:text-zinc-500">
              La ubicación tardó demasiado. Cierra y vuelve a abrir el panel.
            </p>
          )}
          {geoStatus === "unsupported" && (
            <p className="px-4 py-4 text-sm text-zinc-400 dark:text-zinc-500">
              Geolocalización no disponible en este dispositivo.
            </p>
          )}
          {geoStatus === "ready" && itemsWithCoords.length === 0 && (
            <p className="px-4 py-4 text-sm text-zinc-400 dark:text-zinc-500">
              Ninguna actividad tiene ubicación registrada.
            </p>
          )}
          {geoStatus === "ready" && itemsWithCoords.length > 0 && nearbyItems.length === 0 && (
            <p className="px-4 py-4 text-sm text-zinc-400 dark:text-zinc-500">
              No hay actividades en un radio de {radius} km.
            </p>
          )}

          {/* Nearby items list */}
          {nearbyItems.length > 0 && (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
              {nearbyItems.slice(0, expandable ? visibleCount : PAGE_SIZE).map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="shrink-0 text-base">{TYPE_ICONS[item.type] ?? "💡"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {item.title}
                    </p>
                    {item.location && (
                      <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">{item.location}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${distanceColor(item.distance)}`}
                  >
                    {formatDistance(item.distance)}
                  </span>
                  <a
                    href={getMapsUrl(item.location ?? "", item.locationLat, item.locationLng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  >
                    Maps
                  </a>
                  {item.sourceType === "activity" && tripId && item.activityDate ? (
                    <Link
                      href={`/trips/${tripId}?tab=itinerario#day-${item.activityDate}`}
                      className="shrink-0 rounded-lg bg-zinc-900 px-2.5 py-1 text-xs text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                    >
                      Ver →
                    </Link>
                  ) : itemsHref ? (
                    <Link
                      href={`${itemsHref}#item-${item.id}`}
                      className="shrink-0 rounded-lg bg-zinc-900 px-2.5 py-1 text-xs text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                    >
                      Ver →
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => scrollToItem(item.id)}
                      className="shrink-0 rounded-lg bg-zinc-900 px-2.5 py-1 text-xs text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                    >
                      Ver →
                    </button>
                  )}
                </div>
              ))}
              {expandable && nearbyItems.length > visibleCount && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="w-full px-4 py-3 text-sm text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-700/50 transition-colors"
                >
                  Ver más ({nearbyItems.length - visibleCount} restantes)
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
