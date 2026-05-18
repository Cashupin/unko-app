"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "itinerary-view";

export function ItineraryViewToggle({
  tripId,
  view,
}: {
  tripId: string;
  view: string | undefined;
}) {
  const router = useRouter();
  const isCalendar = view === "calendar";

  // On first load (no explicit view param), restore from localStorage
  useEffect(() => {
    if (view === undefined) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "calendar") {
        router.replace(`/trips/${tripId}?tab=itinerario&view=calendar`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goTo(next: "lista" | "calendar") {
    localStorage.setItem(STORAGE_KEY, next);
    const url =
      next === "calendar"
        ? `/trips/${tripId}?tab=itinerario&view=calendar`
        : `/trips/${tripId}?tab=itinerario`;
    router.push(url);
  }

  return (
    <div className="flex overflow-hidden rounded-lg border border-[#27272a] text-xs font-medium">
      <button
        type="button"
        onClick={() => goTo("lista")}
        className={`px-3 py-1.5 transition-colors ${!isCalendar ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
      >
        Lista
      </button>
      <button
        type="button"
        onClick={() => goTo("calendar")}
        className={`border-l border-[#27272a] px-3 py-1.5 transition-colors ${isCalendar ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
      >
        Calendario
      </button>
    </div>
  );
}
