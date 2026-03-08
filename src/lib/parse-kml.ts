import { kml } from "@tmcw/togeojson";
import { unzipSync } from "fflate";

export type KmlPin = {
  name: string;
  description?: string;
  lat?: number;
  lng?: number;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function pinsFromKmlText(kmlText: string): KmlPin[] {
  const doc = new DOMParser().parseFromString(kmlText, "text/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error("El archivo KML no es válido");

  const geojson = kml(doc);
  const pins: KmlPin[] = [];

  for (const feature of geojson.features) {
    if (feature.geometry?.type !== "Point") continue;
    const [lng, lat] = (feature.geometry as { type: "Point"; coordinates: number[] }).coordinates;
    const rawName = (feature.properties?.name as string | undefined)?.trim() ?? "";
    if (!rawName) continue;

    const rawDescRaw = feature.properties?.description;
    const rawDesc = typeof rawDescRaw === "string" ? rawDescRaw : "";
    const description = rawDesc ? stripHtml(rawDesc) : undefined;

    pins.push({ name: rawName, description: description || undefined, lat, lng });
  }

  return pins;
}

export async function parseKmlFile(file: File): Promise<KmlPin[]> {
  const buffer = await file.arrayBuffer();
  const isKmz = file.name.toLowerCase().endsWith(".kmz") || file.type.includes("zip");

  let kmlText: string;
  if (isKmz) {
    const files = unzipSync(new Uint8Array(buffer));
    const kmlEntry = Object.entries(files).find(([name]) =>
      name.toLowerCase().endsWith(".kml"),
    );
    if (!kmlEntry) throw new Error("No se encontró archivo .kml dentro del KMZ");
    kmlText = new TextDecoder().decode(kmlEntry[1]);
  } else {
    kmlText = new TextDecoder().decode(buffer);
  }

  return pinsFromKmlText(kmlText);
}
