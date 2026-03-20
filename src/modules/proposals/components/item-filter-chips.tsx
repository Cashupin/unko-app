"use client";

import { useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const TYPE_CHIPS = [
  { value: "", label: "Todos" },
  { value: "FOOD", label: "🍜 Comida" },
  { value: "PLACE", label: "📍 Lugares" },
] as const;

export function ItemFilterChips() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentType = searchParams.get("itemType") ?? "";
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

  return (
    <div className="flex items-center gap-3">
      {/* Search */}
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

      {/* Type chips */}
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
  );
}
