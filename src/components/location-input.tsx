"use client";

import { useRef, useState, useEffect, useId } from "react";

type PhotonFeature = {
  geometry: { coordinates: [number, number] }; // [lng, lat]
  properties: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    osm_id?: number;
  };
};

type DropdownPos = { top: number; left: number; width: number };

function buildLabel(p: PhotonFeature["properties"]): string {
  const parts = [p.name, p.city, p.state, p.country].filter(Boolean);
  return parts.join(", ");
}

export function LocationInput({
  name,
  nameLat,
  nameLng,
  nameAddress,
  defaultValue = "",
  defaultLat,
  defaultLng,
  defaultAddress,
  onChange,
  placeholder = "Buscar ubicación...",
  id,
}: {
  name: string;
  nameLat: string;
  nameLng: string;
  nameAddress?: string;
  defaultValue?: string;
  defaultLat?: number | null;
  defaultLng?: number | null;
  defaultAddress?: string | null;
  onChange?: (text: string, lat: number | null, lng: number | null) => void;
  placeholder?: string;
  id?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [displayValue, setDisplayValue] = useState(defaultValue);
  const [lat, setLat] = useState<number | null>(defaultLat ?? null);
  const [lng, setLng] = useState<number | null>(defaultLng ?? null);
  const [address, setAddress] = useState<string>(defaultAddress ?? "");
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null);

  const internalId = useId();
  const resolvedId = id ?? internalId;

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function computePos() {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setDisplayValue(value);
    setLat(null);
    setLng(null);
    setAddress("");

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: value.trim(), limit: "6", lang: "en" });
        const res = await fetch(`https://photon.komoot.io/api/?${params}`, {
          headers: {
            "Accept": "application/json",
          },
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Photon ${res.status} ${res.statusText}: ${text}`);
        }
        const data = (await res.json()) as { features: PhotonFeature[] };
        if (data.features?.length > 0) {
          computePos();
          setSuggestions(data.features);
          setOpen(true);
        } else {
          setSuggestions([]);
          setOpen(false);
        }
      } catch (err) {
        console.error("[LocationInput] Photon fetch failed:", err instanceof Error ? `${err.constructor.name}: ${err.message}` : err);
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  function selectSuggestion(feature: PhotonFeature) {
    const [featureLng, featureLat] = feature.geometry.coordinates;
    const label = buildLabel(feature.properties);
    setDisplayValue(label);
    setLat(featureLat);
    setLng(featureLng);
    setAddress(label);
    setSuggestions([]);
    setOpen(false);
    onChange?.(label, featureLat, featureLng);
    if (inputRef.current) inputRef.current.value = label;
  }

  function handleClear() {
    setDisplayValue("");
    setLat(null);
    setLng(null);
    setAddress("");
    setSuggestions([]);
    setOpen(false);
    onChange?.("", null, null);
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }

  function handleBlur() {
    // Cancel any pending autocomplete search so it can't reopen the dropdown after blur
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setTimeout(() => setOpen(false), 150);

    // Auto-geocode: if the user typed/pasted text without selecting a suggestion, resolve coords silently
    if (!displayValue.trim() || lat != null) return;
    void (async () => {
      try {
        const params = new URLSearchParams({ q: displayValue.trim(), limit: "1", lang: "en" });
        const res = await fetch(`https://photon.komoot.io/api/?${params}`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { features: PhotonFeature[] };
        const first = data.features?.[0];
        if (!first) return;
        const [featureLng, featureLat] = first.geometry.coordinates;
        setLat(featureLat);
        setLng(featureLng);
        onChange?.(displayValue, featureLat, featureLng);
      } catch {
        // silently ignore — coordinates remain null
      }
    })();
  }

  return (
    <div className="relative">
      {/* Hidden inputs carry confirmed values into FormData */}
      <input type="hidden" name={name} value={displayValue} />
      <input type="hidden" name={nameLat} value={lat ?? ""} />
      <input type="hidden" name={nameLng} value={lng ?? ""} />
      {nameAddress && <input type="hidden" name={nameAddress} value={address} />}

      {/* Pin icon */}
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 dark:text-zinc-500">
        📍
      </span>

      {/* Visible input */}
      <input
        ref={inputRef}
        id={resolvedId}
        type="text"
        defaultValue={defaultValue}
        placeholder={loading ? "Buscando..." : placeholder}
        onChange={handleInputChange}
        onBlur={handleBlur}
        autoComplete="off"
        className="w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-12 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
      />

      {/* Right-side icons: geocoded indicator or clear button */}
      {displayValue && (
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {lat != null && (
            <span className="text-xs text-green-500 dark:text-green-400" title="Ubicación confirmada">✓</span>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
            aria-label="Limpiar ubicación"
          >
            ✕
          </button>
        </div>
      )}

      {/* Suggestions dropdown — fixed to escape overflow containers (e.g. modal scroll) */}
      {open && suggestions.length > 0 && dropdownPos && (
        <ul
          style={{
            position: "fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
          }}
          className="z-200 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
        >
          {suggestions.map((f, i) => {
            const label = buildLabel(f.properties);
            return (
              <li key={i}>
                <button
                  type="button"
                  onMouseDown={() => selectSuggestion(f)}
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
                >
                  <span className="mt-0.5 shrink-0 text-zinc-400 dark:text-zinc-500">📍</span>
                  <span className="text-zinc-800 dark:text-zinc-200">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
