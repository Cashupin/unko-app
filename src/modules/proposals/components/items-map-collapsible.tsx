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
  selectedCity,
}: {
  items: MapItem[];
  selectedCity: string | null;
}) {
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("items-map-collapsed");
    if (saved !== null) setCollapsed(saved !== "false");
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("items-map-collapsed", String(next));
  }

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
                : `${items.length} ${items.length === 1 ? "actividad" : "actividades"} en el mapa${selectedCity ? ` · ${selectedCity}` : ""}`}
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
              {selectedCity
                ? `No hay actividades con ubicación en ${selectedCity}.`
                : "Agrega ubicaciones a tus actividades para verlas en el mapa."}
            </p>
          ) : (
            <div className="isolate h-80 md:h-96">
              <ItemsMapLeaflet items={items} selectedCity={selectedCity} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
