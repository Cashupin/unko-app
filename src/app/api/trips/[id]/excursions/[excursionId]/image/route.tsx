import { NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const S = 2; // render at 2× for HD output

// Module-level cache: survives across hot requests within the same process instance
const imageBufferCache = new Map<string, string>();

// For Cloudinary URLs: request only the exact thumbnail size to reduce memory usage
function optimizeImageUrl(url: string): string {
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace("/upload/", "/upload/c_fill,w_160,h_160,q_auto,f_auto/");
  }
  return url;
}

async function fetchDataUrl(url: string): Promise<string | null> {
  const fetchUrl = optimizeImageUrl(url);
  if (imageBufferCache.has(fetchUrl)) return imageBufferCache.get(fetchUrl)!;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(fetchUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    const dataUrl = `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
    imageBufferCache.set(fetchUrl, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

function fmtDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const WIDTH = 1080 * S;
const HEADER_H = 220 * S;
const FOOTER_H = 72 * S;

function activityHeight(a: { location: string | null; description: string | null; notes: string | null }) {
  let h = 56;
  if (a.location) h += 22;
  if (a.description) h += 26;
  if (a.notes) h += 22;
  return (h + 24) * S;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; excursionId: string }> }
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { id: tripId, excursionId } = await params;

  const participant = await prisma.tripParticipant.findFirst({
    where: { tripId, userId: session.user.id },
  });
  if (!participant) return new NextResponse("Forbidden", { status: 403 });

  const excursion = await prisma.excursion.findFirst({
    where: { id: excursionId, tripId },
    include: {
      trip: { select: { name: true } },
      activities: {
        where: { isDraft: false },
        select: {
          id: true,
          title: true,
          activityTime: true,
          location: true,
          description: true,
          notes: true,
          photoUrl: true,
        },
        orderBy: [{ activityTime: "asc" }],
      },
    },
  });

  if (!excursion) return new NextResponse("Not found", { status: 404 });

  // Pre-fetch photos — if any fail, they simply won't appear in the image
  const photoUrls = excursion.activities.map((a) => a.photoUrl).filter((u): u is string => !!u);
  const photoDataMap = new Map<string, string>();
  await Promise.all(
    photoUrls.map(async (url) => {
      const dataUrl = await fetchDataUrl(url);
      if (dataUrl) photoDataMap.set(url, dataUrl);
    })
  );

  const actCount = excursion.activities.length;
  const descExtra = excursion.description ? 28 * S : 0;
  const notesExtra = excursion.notes ? 28 * S : 0;
  const activitiesH = actCount === 0
    ? 80 * S
    : excursion.activities.reduce((sum, a) => sum + activityHeight(a), 0);

  const HEIGHT = Math.max(480 * S, HEADER_H + descExtra + notesExtra + activitiesH + FOOTER_H + 48 * S);

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          background: "#0E1113",
          display: "flex",
          flexDirection: "column",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: `${44 * S}px ${52 * S}px ${32 * S}px`,
            borderBottom: `${S}px solid #27272a`,
            display: "flex",
            flexDirection: "column",
            gap: 8 * S,
          }}
        >
          <div style={{ color: "#52525b", fontSize: 14 * S, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", display: "flex" }}>
            {excursion.trip.name}
          </div>

          <div style={{ color: "#f4f4f5", fontSize: 34 * S, fontWeight: 700, display: "flex", alignItems: "center", gap: 12 * S }}>
            <span style={{ fontSize: 30 * S }}>🗺️</span>
            <span>{excursion.title}</span>
          </div>

          {excursion.date && (
            <div style={{ color: "#5eead4", fontSize: 17 * S, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 * S }}>
              <span>📅</span>
              <span style={{ textTransform: "capitalize" }}>{fmtDate(excursion.date)}</span>
            </div>
          )}

          {excursion.description && (
            <div style={{ color: "#a1a1aa", fontSize: 15 * S, display: "flex" }}>
              {excursion.description}
            </div>
          )}

          {excursion.notes && (
            <div style={{ color: "#fbbf24", fontSize: 14 * S, display: "flex", alignItems: "center", gap: 6 * S }}>
              <span>⚠️</span>
              <span>{excursion.notes}</span>
            </div>
          )}
        </div>

        {/* Activities */}
        <div style={{ flex: 1, padding: `${20 * S}px ${52 * S}px 0`, display: "flex", flexDirection: "column", gap: 10 * S }}>
          {actCount === 0 ? (
            <div style={{ color: "#3f3f46", fontSize: 15 * S, display: "flex", paddingTop: 16 * S }}>
              Sin actividades registradas
            </div>
          ) : (
            excursion.activities.map((a) => (
              <div
                key={a.id}
                style={{
                  background: "#1c1d20",
                  borderRadius: 14 * S,
                  padding: `${14 * S}px ${18 * S}px`,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14 * S,
                  border: `${S}px solid #27272a`,
                }}
              >
                {/* Time badge */}
                {a.activityTime ? (
                  <div
                    style={{
                      background: "#27272a",
                      borderRadius: 8 * S,
                      padding: `${5 * S}px ${10 * S}px`,
                      color: "#d4d4d8",
                      fontSize: 13 * S,
                      fontWeight: 700,
                      minWidth: 52 * S,
                      textAlign: "center",
                      display: "flex",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {a.activityTime}
                  </div>
                ) : (
                  <div style={{ width: 52 * S, flexShrink: 0, display: "flex" }} />
                )}

                {/* Content */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 * S, flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#f4f4f5", fontSize: 16 * S, fontWeight: 600, display: "flex" }}>
                    {a.title}
                  </div>
                  {a.description && (
                    <div style={{ color: "#a1a1aa", fontSize: 13 * S, display: "flex" }}>
                      {a.description}
                    </div>
                  )}
                  {a.location && (
                    <div style={{ color: "#71717a", fontSize: 13 * S, display: "flex", gap: 4 * S }}>
                      <span>📍</span>
                      <span>{a.location}</span>
                    </div>
                  )}
                  {a.notes && (
                    <div style={{ color: "#a16207", fontSize: 12 * S, fontStyle: "italic", display: "flex", gap: 4 * S }}>
                      <span>💬</span>
                      <span>{a.notes}</span>
                    </div>
                  )}
                </div>

                {/* Photo thumbnail — only rendered if fetch succeeded */}
                {a.photoUrl && photoDataMap.has(a.photoUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoDataMap.get(a.photoUrl)!}
                    alt=""
                    style={{
                      width: 80 * S,
                      height: 80 * S,
                      borderRadius: 10 * S,
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: `${16 * S}px ${52 * S}px`,
            marginTop: 20 * S,
            borderTop: `${S}px solid #1c1d20`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ color: "#3f3f46", fontSize: 13 * S, display: "flex" }}>UnkoTrip</div>
          <div style={{ color: "#3f3f46", fontSize: 13 * S, display: "flex" }}>
            {actCount} actividad{actCount !== 1 ? "es" : ""}
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
  );
}
