export function getMapsUrl(location: string, lat?: number | null, lng?: number | null): string {
  void lat; void lng;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}
