"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import type { MapItem } from "@/modules/proposals/components/items-map-leaflet";

const ItemsMapLeaflet = dynamic(
  () => import("@/modules/proposals/components/items-map-leaflet").then((m) => m.ItemsMapLeaflet),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Cargando mapa...
      </div>
    ),
  },
);

export function ItemsMapCollapsible({
  items,
  cityCounts,
}: {
  items: MapItem[];
  cityCounts: Record<string, number>;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("items-map-collapsed");
    if (saved !== null) setCollapsed(saved !== "false");
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("items-map-collapsed", String(next));
  }

  const cityEntries = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#2d2d31] bg-[#1f2023]">
      {/* Header */}
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-[#27272a]/50"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#27272a] text-base">
            🗺️
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-100">Mapa de actividades</p>
            <p className="text-xs text-zinc-500">
              {items.length === 0
                ? "Ninguna actividad tiene ubicación"
                : `${items.length} ${items.length === 1 ? "actividad" : "actividades"} en el mapa`}
            </p>
          </div>
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${collapsed ? "" : "rotate-180"}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="border-t border-[#2d2d31]">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-zinc-500">
              Agrega ubicaciones a tus actividades para verlas en el mapa.
            </p>
          ) : (
            <>
              {/* City summary chips */}
              {cityEntries.length > 0 && (
                <div className="flex flex-wrap gap-2 border-b border-[#2d2d31] px-4 py-3">
                  {cityEntries.map(([city, count]) => {
                    const active = selectedCity === city;
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => setSelectedCity(active ? null : city)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                          active
                            ? "border-zinc-400 bg-zinc-600 text-zinc-100"
                            : "border-[#3f3f46] bg-[#27272a] text-zinc-200 hover:bg-[#3f3f46]"
                        }`}
                      >
                        <span className="font-medium">{city}</span>
                        <span className="rounded-full bg-[#3f3f46] px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Map */}
              <div className="isolate h-80 md:h-96">
                <ItemsMapLeaflet items={items} selectedCity={selectedCity} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
