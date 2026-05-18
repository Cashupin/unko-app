"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import { getItemIcon } from "@/modules/proposals/lib/item-icons";

export type MapItem = {
  id: string;
  title: string;
  type: string;
  location: string | null;
  imageUrl: string | null;
  locationLat: number;
  locationLng: number;
  city: string | null;
};

function makeIcon(emoji: string) {
  return L.divIcon({
    html: `<div style="
      width:36px;height:36px;
      background:#18181b;
      border:2px solid #3f3f46;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:17px;
      box-shadow:0 2px 6px rgba(0,0,0,0.6);
      cursor:pointer;
    ">${emoji}</div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
  });
}

function openItemModal(id: string) {
  const el = document.getElementById(`item-${id}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  document.dispatchEvent(new CustomEvent("item:open-modal", { detail: { id } }));
}

function FitBounds({ items }: { items: MapItem[] }) {
  const map = useMap();
  useEffect(() => {
    if (items.length === 0) return;
    if (items.length === 1) {
      map.setView([items[0].locationLat, items[0].locationLng], 13);
      return;
    }
    const bounds: LatLngBoundsExpression = items.map((i) => [i.locationLat, i.locationLng]);
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [items, map]);
  return null;
}

function FlyToCity({ items, selectedCity }: { items: MapItem[]; selectedCity: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedCity) return;
    const cityItems = items.filter((i) => (i.city ?? "Otra") === selectedCity);
    if (cityItems.length === 0) return;
    if (cityItems.length === 1) {
      map.flyTo([cityItems[0].locationLat, cityItems[0].locationLng], 13, { duration: 1 });
      return;
    }
    const bounds: LatLngBoundsExpression = cityItems.map((i) => [i.locationLat, i.locationLng]);
    map.flyToBounds(bounds, { padding: [48, 48], duration: 1 });
  }, [selectedCity, items, map]);
  return null;
}

export function ItemsMapLeaflet({ items, selectedCity }: { items: MapItem[]; selectedCity: string | null }) {
  const center: [number, number] =
    items.length > 0 ? [items[0].locationLat, items[0].locationLng] : [20, 0];

  return (
    <MapContainer
      center={center}
      zoom={5}
      className="h-full w-full"
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      <FitBounds items={items} />
      <FlyToCity items={items} selectedCity={selectedCity} />
      {items.map((item) => (
        <Marker
          key={item.id}
          position={[item.locationLat, item.locationLng]}
          icon={makeIcon(getItemIcon(item.type, item.title))}
        >
          <Popup minWidth={220} maxWidth={260}>
            <div style={{ fontFamily: "inherit" }}>
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 6, marginBottom: 8 }}
                />
              )}
              <div style={{ fontWeight: 600, fontSize: 13, color: "#18181b", lineHeight: 1.3, marginBottom: 2 }}>
                {item.title}
              </div>
              {item.location && (
                <div style={{ fontSize: 11, color: "#71717a", marginBottom: 8 }}>
                  {item.location}
                </div>
              )}
              <button
                onClick={() => openItemModal(item.id)}
                style={{
                  width: "100%",
                  background: "#18181b",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Ver detalles →
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
