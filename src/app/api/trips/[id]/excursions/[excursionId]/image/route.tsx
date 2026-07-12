import { NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function fmtDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const WIDTH = 1080;
const HEADER_H = 220;
const ACTIVITY_H = 96;
const FOOTER_H = 72;

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
        },
        orderBy: [{ activityTime: "asc" }],
      },
    },
  });

  if (!excursion) return new NextResponse("Not found", { status: 404 });

  const actCount = excursion.activities.length;
  const descExtra = excursion.description ? 28 : 0;
  const notesExtra = excursion.notes ? 28 : 0;
  const HEIGHT = Math.max(
    480,
    HEADER_H + descExtra + notesExtra + Math.max(actCount, 1) * ACTIVITY_H + FOOTER_H + 48,
  );

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
            padding: "44px 52px 32px",
            borderBottom: "1px solid #27272a",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ color: "#52525b", fontSize: 14, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", display: "flex" }}>
            {excursion.trip.name}
          </div>

          <div style={{ color: "#f4f4f5", fontSize: 34, fontWeight: 700, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 30 }}>🗺️</span>
            <span>{excursion.title}</span>
          </div>

          {excursion.date && (
            <div style={{ color: "#93c5fd", fontSize: 17, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
              <span>📅</span>
              <span style={{ textTransform: "capitalize" }}>{fmtDate(excursion.date)}</span>
            </div>
          )}

          {excursion.description && (
            <div style={{ color: "#a1a1aa", fontSize: 15, display: "flex" }}>
              {excursion.description}
            </div>
          )}

          {excursion.notes && (
            <div style={{ color: "#fbbf24", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <span>⚠️</span>
              <span>{excursion.notes}</span>
            </div>
          )}
        </div>

        {/* Activities */}
        <div style={{ flex: 1, padding: "20px 52px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {actCount === 0 ? (
            <div style={{ color: "#3f3f46", fontSize: 15, display: "flex", paddingTop: 16 }}>
              Sin actividades registradas
            </div>
          ) : (
            excursion.activities.map((a) => (
              <div
                key={a.id}
                style={{
                  background: "#1c1d20",
                  borderRadius: 14,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  border: "1px solid #27272a",
                }}
              >
                {a.activityTime ? (
                  <div
                    style={{
                      background: "#27272a",
                      borderRadius: 8,
                      padding: "5px 10px",
                      color: "#d4d4d8",
                      fontSize: 13,
                      fontWeight: 700,
                      minWidth: 52,
                      textAlign: "center",
                      display: "flex",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {a.activityTime}
                  </div>
                ) : (
                  <div style={{ width: 52, flexShrink: 0, display: "flex" }} />
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  <div style={{ color: "#f4f4f5", fontSize: 16, fontWeight: 600, display: "flex" }}>
                    {a.title}
                  </div>
                  {a.location && (
                    <div style={{ color: "#71717a", fontSize: 13, display: "flex", gap: 4 }}>
                      <span>📍</span>
                      <span>{a.location}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 52px",
            marginTop: 20,
            borderTop: "1px solid #1c1d20",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ color: "#3f3f46", fontSize: 13, display: "flex" }}>UnkoTrip</div>
          <div style={{ color: "#3f3f46", fontSize: 13, display: "flex" }}>
            {actCount} actividad{actCount !== 1 ? "es" : ""}
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );
}
