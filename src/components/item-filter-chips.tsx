"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "border border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}

const TYPE_CHIPS = [
  { value: "", label: "Todos" },
  { value: "FOOD", label: "🍽️ Comida" },
  { value: "PLACE", label: "🏛️ Lugares" },
] as const;

export function ItemFilterChips() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentType = searchParams.get("itemType") ?? "";
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasActiveFilters = !!currentType || searchParams.has("search");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("itemFiltersOpen");
    setOpen(stored !== null ? stored === "true" : hasActiveFilters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleOpen() {
    setOpen((v) => {
      localStorage.setItem("itemFiltersOpen", String(!v));
      return !v;
    });
  }

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
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700">
      {/* Toggle header */}
      <button
        onClick={toggleOpen}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
          </svg>
          Filtros
          {hasActiveFilters && (
            <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
              {[currentType, searchParams.has("search") ? "1" : ""].filter(Boolean).length}
            </span>
          )}
        </div>
        <ChevronIcon open={open} />
      </button>

      {/* Collapsible content */}
      {open && (
        <div className="flex flex-col gap-2 border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-700">
          {/* Search input */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
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
              className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-8 pr-8 text-sm text-zinc-800 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-700"
            />
            {searchValue && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                aria-label="Limpiar búsqueda"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Type chips */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {TYPE_CHIPS.map((chip) => (
              <Chip
                key={chip.value}
                label={chip.label}
                active={currentType === chip.value}
                onClick={() => setFilter("itemType", chip.value)}
              />
            ))}
          </div>

        </div>
      )}
    </div>
  );
}
