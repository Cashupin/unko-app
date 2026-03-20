"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { importKmlItems, getTripItemsForDedup, type ImportKmlItem, type ImportKmlResult, type ExistingItemStub } from "@/modules/proposals/actions/import-kml";
import type { KmlPin } from "@/modules/proposals/lib/parse-kml";

type Phase = "idle" | "preview" | "importing" | "result";

type PreviewItem = KmlPin & {
  selected: boolean;
  type: "PLACE" | "FOOD";
  imageUrl: string | null;
  uploading: boolean;
};

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isDuplicate(pin: KmlPin, existing: ExistingItemStub[]): boolean {
  if (existing.some((e) => e.title.toLowerCase() === pin.name.toLowerCase())) return true;
  if (pin.lat != null && pin.lng != null) {
    if (existing.some((e) =>
      e.locationLat != null && e.locationLng != null &&
      haversineMeters(pin.lat!, pin.lng!, e.locationLat, e.locationLng) < 50
    )) return true;
  }
  return false;
}

async function uploadImageFile(file: File): Promise<string> {
  const sigRes = await fetch("/api/upload/signature", { method: "POST" });
  if (!sigRes.ok) throw new Error("No se pudo obtener la firma de subida");
  const sig = await sigRes.json() as {
    signature: string; timestamp: number; apiKey: string;
    cloudName: string; folder: string; allowedFormats: string;
  };
  const form = new FormData();
  form.append("file", file);
  form.append("signature", sig.signature);
  form.append("timestamp", String(sig.timestamp));
  form.append("api_key", sig.apiKey);
  form.append("folder", sig.folder);
  form.append("allowed_formats", sig.allowedFormats);
  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
    { method: "POST", body: form },
  );
  if (!uploadRes.ok) {
    const body = await uploadRes.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? "La subida falló");
  }
  const { secure_url } = await uploadRes.json() as { secure_url: string };
  return secure_url;
}

export function KmlImport({ tripId }: { tripId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [analyzing, setAnalyzing] = useState(false);
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [result, setResult] = useState<ImportKmlResult | null>(null);

  function reset() {
    setPhase("idle");
    setItems([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function close() {
    reset();
    setOpen(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    try {
      const [{ parseKmlFile }, existing] = await Promise.all([
        import("@/modules/proposals/lib/parse-kml"),
        getTripItemsForDedup(tripId),
      ]);
      const pins = await parseKmlFile(file);
      const newPins = pins.filter((p) => !isDuplicate(p, existing));
      const skipped = pins.length - newPins.length;

      if (newPins.length === 0) {
        if (skipped > 0) {
          toast.info(`Todos los pines (${pins.length}) ya existen en el viaje`);
        } else {
          toast.error("No se encontraron pines en el archivo");
        }
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      if (skipped > 0) {
        toast.info(`${skipped} pin${skipped !== 1 ? "es" : ""} ya existente${skipped !== 1 ? "s" : ""} omitido${skipped !== 1 ? "s" : ""}`);
      }

      setItems(newPins.map((p) => ({ ...p, selected: true, type: "PLACE" as const, imageUrl: null, uploading: false })));
      setPhase("preview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al leer el archivo");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleImageUpload(idx: number, file: File) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, uploading: true } : it));
    try {
      const url = await uploadImageFile(file);
      setItems((prev) => prev.map((it, i) => i === idx ? { ...it, imageUrl: url, uploading: false } : it));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir la imagen");
      setItems((prev) => prev.map((it, i) => i === idx ? { ...it, uploading: false } : it));
    }
  }

  async function handleImport() {
    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) return;
    setPhase("importing");
    try {
      const payload: ImportKmlItem[] = selected.map((i) => ({
        name: i.name,
        description: i.description,
        lat: i.lat,
        lng: i.lng,
        location: i.lat != null && i.lng != null
          ? `${i.lat.toFixed(6)}, ${i.lng.toFixed(6)}`
          : undefined,
        type: i.type,
        imageUrl: i.imageUrl,
      }));
      const res = await importKmlItems(tripId, payload);
      setResult(res);
      setPhase("result");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al importar");
      setPhase("preview");
    }
  }

  const selectedCount = items.filter((i) => i.selected).length;
  const anyUploading = items.some((i) => i.uploading);

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
        title="Importar ítems desde Google My Maps (KML/KMZ)"
      >
        📥 Importar KML
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && phase !== "importing") close();
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto dark:bg-zinc-800">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Importar desde Google My Maps
              </h2>
              {phase !== "importing" && (
                <button
                  onClick={close}
                  className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              )}
            </div>

            {/* ── Fase idle ── */}
            {phase === "idle" && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  En Google My Maps: menú ⋮ → <strong>Exportar a KML/KMZ</strong> → descarga el archivo y súbelo aquí.
                </p>

                <label className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-colors ${
                  analyzing
                    ? "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-700/30"
                    : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:hover:border-zinc-500 dark:hover:bg-zinc-700/30"
                }`}>
                  <span className="text-2xl">{analyzing ? "⏳" : "📂"}</span>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {analyzing ? "Analizando archivo..." : "Seleccionar archivo .kml o .kmz"}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    Exportado desde Google My Maps
                  </span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".kml,.kmz"
                    className="hidden"
                    disabled={analyzing}
                    onChange={handleFileChange}
                  />
                </label>

                <div className="flex justify-end">
                  <button
                    onClick={close}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* ── Fase preview ── */}
            {phase === "preview" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                  <span>{selectedCount} de {items.length} pines seleccionados</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setItems((prev) => prev.map((i) => ({ ...i, selected: true })))}
                      className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Seleccionar todos
                    </button>
                    <span className="text-zinc-300 dark:text-zinc-600">|</span>
                    <button
                      onClick={() => setItems((prev) => prev.map((i) => ({ ...i, selected: false })))}
                      className="text-xs text-zinc-400 hover:underline dark:text-zinc-500"
                    >
                      Deseleccionar todos
                    </button>
                  </div>
                </div>

                <ul className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex flex-col gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-700/50"
                    >
                      {/* Row 1: checkbox + name + type */}
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it, i) => i === idx ? { ...it, selected: e.target.checked } : it)
                            )
                          }
                          className="mt-0.5 shrink-0 accent-zinc-800 dark:accent-zinc-300"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {item.name}
                          </p>
                          {item.description && (
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                          )}
                          {item.lat != null && item.lng != null && (
                            <p className="text-[10px] text-zinc-300 dark:text-zinc-600 mt-0.5">
                              {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                            </p>
                          )}
                        </div>
                        <select
                          value={item.type}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, type: e.target.value as "PLACE" | "FOOD" } : it
                              )
                            )
                          }
                          className="shrink-0 rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                        >
                          <option value="PLACE">Lugar</option>
                          <option value="FOOD">Comida</option>
                        </select>
                      </div>

                      {/* Row 2: image */}
                      <div className="flex items-center gap-2 pl-6">
                        {item.imageUrl ? (
                          <div className="flex items-center gap-2">
                            <div className="relative h-10 w-16 rounded overflow-hidden border border-zinc-200 dark:border-zinc-600 shrink-0">
                              <Image src={item.imageUrl} alt="" fill className="object-cover" />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setItems((prev) =>
                                  prev.map((it, i) => i === idx ? { ...it, imageUrl: null } : it)
                                )
                              }
                              className="text-xs text-red-500 hover:underline"
                            >
                              Quitar
                            </button>
                          </div>
                        ) : (
                          <label className={`flex items-center gap-1 cursor-pointer rounded border border-dashed border-zinc-300 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-400 hover:text-zinc-500 transition-colors dark:border-zinc-600 dark:text-zinc-500 dark:hover:border-zinc-500 ${item.uploading ? "opacity-50 pointer-events-none" : ""}`}>
                            {item.uploading ? "⏳ Subiendo..." : "📷 Añadir foto"}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={item.uploading}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleImageUpload(idx, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={reset}
                    disabled={anyUploading}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={selectedCount === 0 || anyUploading}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {anyUploading ? "Subiendo fotos..." : `Importar${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
                  </button>
                </div>
              </div>
            )}

            {/* ── Fase importing ── */}
            {phase === "importing" && (
              <div className="py-8 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Importando ítems...
                </p>
              </div>
            )}

            {/* ── Fase result ── */}
            {phase === "result" && result && (
              <div className="flex flex-col gap-4">
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 dark:bg-green-900/20 dark:border-green-800">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    ✓ {result.imported} ítem{result.imported !== 1 ? "s" : ""} importado{result.imported !== 1 ? "s" : ""}
                  </p>
                </div>

                {result.errors.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {result.errors.length} ítem{result.errors.length !== 1 ? "s" : ""} no importado{result.errors.length !== 1 ? "s" : ""}:
                    </p>
                    <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                      {result.errors.map((err, i) => (
                        <li
                          key={i}
                          className="rounded border border-red-100 bg-red-50 px-3 py-1.5 dark:border-red-900/40 dark:bg-red-900/20"
                        >
                          <span className="text-xs font-medium text-red-800 dark:text-red-300">
                            {err.name}
                          </span>
                          <span className="text-xs text-red-600 dark:text-red-400">
                            {" — "}{err.reason}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => { close(); router.refresh(); }}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Listo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
