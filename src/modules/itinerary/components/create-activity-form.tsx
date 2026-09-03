"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UploadPhoto } from "@/components/ui/upload-photo";
import { DatePicker } from "@/components/ui/date-picker";
import { LocationInput } from "@/components/ui/location-input";
import { toast } from "sonner";

type ItemOption = {
  id: string;
  title: string;
  type: "PLACE" | "FOOD" | "ACTIVITY";
  imageUrl: string | null;
  location: string | null;
  description: string | null;
  locationLat: number | null;
  locationLng: number | null;
};

const TYPE_ICON: Record<string, string> = { PLACE: "📍", FOOD: "🍜", ACTIVITY: "🎯" };

export function CreateActivityForm({
  tripId,
  defaultDate,
  tripStartDate,
  isAdmin = false,
  compact = false,
  overlayZIndex = "z-50",
  excursionId,
  excursionTitle,
}: {
  tripId: string;
  defaultDate?: string;
  tripStartDate?: string;
  isAdmin?: boolean;
  compact?: boolean;
  overlayZIndex?: string;
  excursionId?: string;
  excursionTitle?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isDraft, setIsDraft] = useState(false);
  const [createProposal, setCreateProposal] = useState(false);
  const [proposalType, setProposalType] = useState<"PLACE" | "FOOD" | "ACTIVITY">("PLACE");

  // ── Campos controlados (para pre-llenado desde propuesta) ───────────────────
  const [titleValue, setTitleValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [locationKey, setLocationKey] = useState(0);
  const [defaultLocation, setDefaultLocation] = useState<{ value: string; lat: number | null; lng: number | null }>({ value: "", lat: null, lng: null });

  // ── Item/proposal search (solo en contexto de excursión) ─────────────────────
  const [availableItems, setAvailableItems] = useState<ItemOption[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemOption | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const itemSearchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredItems = availableItems.filter((item) =>
    item.title.toLowerCase().includes(itemSearch.toLowerCase()) ||
    (item.location ?? "").toLowerCase().includes(itemSearch.toLowerCase())
  );

  useEffect(() => {
    if (!open || !excursionId) return;
    fetch(`/api/trips/${tripId}/items`)
      .then((r) => r.json())
      .then((data: { items?: ItemOption[] }) => {
        if (data.items) setAvailableItems(data.items);
      })
      .catch(() => {});
  }, [open, excursionId, tripId]);

  useEffect(() => {
    if (!showItemDropdown) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !itemSearchRef.current?.contains(e.target as Node)
      ) {
        setShowItemDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showItemDropdown]);

  function openModal() {
    setPhotoUrl(null);
    setCreateProposal(false);
    setIsDraft(false);
    setSelectedItem(null);
    setItemSearch("");
    setShowItemDropdown(false);
    setTitleValue("");
    setDescriptionValue("");
    setDefaultLocation({ value: "", lat: null, lng: null });
    setLocationKey((k) => k + 1);
    setOpen(true);
  }

  function handleSelectItem(item: ItemOption) {
    setSelectedItem(item);
    setItemSearch("");
    setShowItemDropdown(false);
    setTitleValue(item.title);
    setDescriptionValue(item.description ?? "");
    setDefaultLocation({
      value: item.location ?? "",
      lat: item.locationLat,
      lng: item.locationLng,
    });
    setLocationKey((k) => k + 1);
    if (item.imageUrl) setPhotoUrl(item.imageUrl);
  }

  function closeModal() {
    setOpen(false);
    setPhotoUrl(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);

    const body: Record<string, string | number | boolean | null | undefined> = {
      title: (fd.get("title") as string).trim(),
    };

    const description = (fd.get("description") as string).trim();
    const location = (fd.get("location") as string).trim();
    const latRaw = (fd.get("locationLat") as string).trim();
    const lngRaw = (fd.get("locationLng") as string).trim();
    const locationLat = latRaw ? parseFloat(latRaw) : null;
    const locationLng = lngRaw ? parseFloat(lngRaw) : null;
    const activityDate = fd.get("activityDate") as string;
    const activityTime = fd.get("activityTime") as string;
    const notes = (fd.get("notes") as string).trim();

    if (description) body.description = description;
    if (location) body.location = location;
    if (locationLat != null) body.locationLat = locationLat;
    if (locationLng != null) body.locationLng = locationLng;
    if (activityDate) body.activityDate = activityDate;
    if (activityTime) body.activityTime = activityTime;
    if (notes) body.notes = notes;
    if (photoUrl) body.photoUrl = photoUrl;
    if (isDraft) body.isDraft = true;
    if (excursionId) body.excursionId = excursionId;
    if (selectedItem) body.itemId = selectedItem.id;

    try {
      const res = await fetch(`/api/trips/${tripId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { id?: string; error?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Error al crear la actividad");
        return;
      }

      // Optionally create a linked proposal item
      if (createProposal && data.id) {
        const itemBody: Record<string, unknown> = {
          title: body.title,
          type: proposalType,
          tripId,
        };
        if (body.description) itemBody.description = body.description;
        if (body.location) itemBody.location = body.location;
        if (body.locationLat != null) itemBody.locationLat = body.locationLat;
        if (body.locationLng != null) itemBody.locationLng = body.locationLng;

        const itemRes = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemBody),
        });
        const itemData = (await itemRes.json()) as { id?: string };
        if (itemRes.ok && itemData.id) {
          await fetch(`/api/trips/${tripId}/activities/${data.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId: itemData.id }),
          });
        }
      }

      closeModal();
      router.refresh();
      toast.success(createProposal ? "Actividad y propuesta creadas" : "Actividad creada");
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {compact ? (
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-600 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        >
          <span className="text-sm font-light leading-none">+</span>
          Agregar actividad
        </button>
      ) : (
        <button
          onClick={openModal}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + Nueva actividad
        </button>
      )}

      {open && (
        <div
          className={`fixed inset-0 ${overlayZIndex} flex items-center justify-center bg-black/50 p-4`}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto dark:bg-zinc-800">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Nueva actividad
                </h2>
                {excursionTitle && (
                  <p className="text-xs text-blue-400 mt-0.5">🗺️ {excursionTitle}</p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* ── Vincular a propuesta (solo en excursión) ───────────────── */}
              {excursionId && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Vincular a propuesta
                  </label>

                  {selectedItem ? (
                    <div className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-950/20 px-3 py-2">
                      {selectedItem.imageUrl ? (
                        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded">
                          <Image src={selectedItem.imageUrl} alt="" fill className="object-cover" />
                        </div>
                      ) : (
                        <span className="text-base leading-none">{TYPE_ICON[selectedItem.type]}</span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-violet-200">
                        {selectedItem.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                        setSelectedItem(null);
                        setItemSearch("");
                        setTitleValue("");
                        setDescriptionValue("");
                        setDefaultLocation({ value: "", lat: null, lng: null });
                        setLocationKey((k) => k + 1);
                        setPhotoUrl(null);
                      }}
                        className="shrink-0 text-zinc-500 hover:text-zinc-300"
                        aria-label="Quitar propuesta"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        ref={itemSearchRef}
                        type="text"
                        value={itemSearch}
                        onChange={(e) => { setItemSearch(e.target.value); setShowItemDropdown(true); }}
                        onFocus={() => setShowItemDropdown(true)}
                        placeholder="Buscar propuesta… (opcional)"
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                      />
                      {showItemDropdown && filteredItems.length > 0 && (
                        <div
                          ref={dropdownRef}
                          className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-800 shadow-xl"
                        >
                          {filteredItems.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectItem(item)}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-zinc-700"
                            >
                              {item.imageUrl ? (
                                <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded">
                                  <Image src={item.imageUrl} alt="" fill className="object-cover" />
                                </div>
                              ) : (
                                <span className="text-sm leading-none">{TYPE_ICON[item.type]}</span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-zinc-100">{item.title}</p>
                                {item.location && (
                                  <p className="truncate text-[10px] text-zinc-500">{item.location}</p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {showItemDropdown && itemSearch.length > 0 && filteredItems.length === 0 && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-center text-xs text-zinc-500 shadow-xl">
                          Sin resultados
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="ca-title"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  id="ca-title"
                  name="title"
                  type="text"
                  required
                  minLength={1}
                  maxLength={200}
                  placeholder="Ej: Visita al Templo Sensoji"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="ca-description"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Descripción
                </label>
                <textarea
                  id="ca-description"
                  name="description"
                  rows={2}
                  maxLength={1000}
                  placeholder="Descripción breve (opcional)"
                  value={descriptionValue}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                  className="resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="ca-location"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Ubicación
                </label>
                <LocationInput
                  key={locationKey}
                  id="ca-location"
                  name="location"
                  nameLat="locationLat"
                  nameLng="locationLng"
                  placeholder="Ej: Asakusa, Tokyo"
                  defaultValue={defaultLocation.value}
                  defaultLat={defaultLocation.lat}
                  defaultLng={defaultLocation.lng}
                />
              </div>

              <div className={!excursionId ? "grid grid-cols-1 md:grid-cols-2 gap-4" : undefined}>
                {!excursionId && (
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="ca-date"
                      className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Fecha
                    </label>
                    <DatePicker
                      id="ca-date"
                      name="activityDate"
                      defaultValue={defaultDate}
                      placeholder="Seleccionar fecha"
                      initialMonth={tripStartDate}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="ca-time"
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Hora
                  </label>
                  <input
                    id="ca-time"
                    name="activityTime"
                    type="time"
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:ring-zinc-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="ca-notes"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Notas
                </label>
                <textarea
                  id="ca-notes"
                  name="notes"
                  rows={2}
                  maxLength={1000}
                  placeholder="Notas adicionales (opcional)"
                  className="resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                />
              </div>

              {/* Photo upload */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Foto</p>
                {photoUrl ? (
                  <div className="relative">
                    <div className="relative h-36 w-full overflow-hidden rounded-xl">
                      <Image
                        src={photoUrl}
                        alt="Foto de actividad"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setPhotoUrl(null)}
                      className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white hover:bg-black/80"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <UploadPhoto
                    onUpload={setPhotoUrl}
                    label="+ Subir foto"
                    disabled={loading}
                    subfolder={`${tripId}/itinerary`}
                  />
                )}
              </div>

              {/* Agregar como borrador — solo ADMIN, no aplica en excursiones */}
              {isAdmin && !excursionId && (
                <div className="rounded-xl border border-dashed border-indigo-500/30 bg-indigo-950/10 px-3 py-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDraft}
                      onChange={(e) => {
                        setIsDraft(e.target.checked);
                        if (e.target.checked) setCreateProposal(false);
                      }}
                      className="rounded accent-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-medium text-indigo-300">
                        Agregar como borrador
                      </span>
                      <p className="text-[10px] text-indigo-400/60 mt-0.5">
                        Solo tú la verás hasta que la confirmes
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Crear también como propuesta — no aplica en excursiones ni en borrador */}
              {!isDraft && !excursionId && <div className="rounded-xl border border-zinc-100 px-3 py-2.5 dark:border-zinc-700">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createProposal}
                    onChange={(e) => setCreateProposal(e.target.checked)}
                    className="rounded accent-zinc-700 dark:accent-zinc-300"
                  />
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Crear también como propuesta del grupo
                  </span>
                </label>
                {createProposal && (
                  <div className="mt-2 flex gap-2 pl-6">
                    {(["PLACE", "FOOD", "ACTIVITY"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setProposalType(t)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          proposalType === t
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "border border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {t === "PLACE" ? "📍 Lugar" : t === "FOOD" ? "🍜 Comida" : "🎯 Actividad"}
                      </button>
                    ))}
                  </div>
                )}
              </div>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
