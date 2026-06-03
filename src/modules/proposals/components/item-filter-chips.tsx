"use client";

import { useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const TYPE_CHIPS = [
  { value: "", label: "Todos" },
  { value: "FOOD", label: "🍜 Comida" },
  { value: "PLACE", label: "📍 Lugares" },
] as const;

export function ItemFilterChips({
  participants = [],
  cityCounts = {},
}: {
  participants?: { id: string; name: string }[];
  cityCounts?: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentType = searchParams.get("itemType") ?? "";
  const currentProposer = searchParams.get("proposer") ?? "";
  const currentCity = searchParams.get("city") ?? "";
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleSearch(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = value.trim();
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed.length >= 3) params.set("search", trimmed);
      else params.delete("search");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, 350);
  }

  const proposerChips = [
    { value: "", label: "Todos" },
    { value: "none", label: "Sin dueño" },
    ...participants.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Row 1: Search + Type chips */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar actividades..."
            className="w-full rounded-xl border border-[#3f3f46] bg-[#27272a] py-2 pl-8 pr-8 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-zinc-500 focus:ring-1 focus:ring-zinc-600"
          />
          {searchValue && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              aria-label="Limpiar búsqueda"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {TYPE_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => setFilter("itemType", chip.value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                currentType === chip.value
                  ? "bg-zinc-100 text-zinc-900"
                  : "border border-[#3f3f46] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Proposer chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
        {proposerChips.map((chip) => (
          <button
            key={chip.value}
            onClick={() => setFilter("proposer", chip.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              currentProposer === chip.value
                ? "bg-zinc-100 text-zinc-900"
                : "border border-[#3f3f46] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Row 3: City chips (only when there are cities) */}
      {Object.keys(cityCounts).length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          <button
            onClick={() => setFilter("city", "")}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              currentCity === ""
                ? "bg-zinc-100 text-zinc-900"
                : "border border-[#3f3f46] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
            }`}
          >
            Todos
          </button>
          {Object.entries(cityCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([city, count]) => {
              const active = currentCity === city;
              return (
                <button
                  key={city}
                  onClick={() => setFilter("city", active ? "" : city)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                    active
                      ? "border-zinc-400 bg-zinc-600 text-zinc-100"
                      : "border-[#3f3f46] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  <span className="font-medium">{city}</span>
                  <span className="rounded-full bg-[#3f3f46] px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                    {count}
                  </span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
