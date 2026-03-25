import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const POLL_INTERVAL = 120_000; // 2 minutos
const HEARTBEAT_INTERVAL = 30_000; // 30s para mantener conexión viva

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: tripId } = await params;

  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId, userId: session.user.id },
    select: { id: true },
  });
  if (!membership) {
    return new Response("Forbidden", { status: 403 });
  }

  const since = req.nextUrl.searchParams.get("since");
  let lastKnown = since ? new Date(since) : new Date();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (data: string) => {
        if (!closed) {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      };

      // Poll Prisma cada POLL_INTERVAL
      const pollInterval = setInterval(async () => {
        if (closed) return;
        try {
          const trip = await prisma.trip.findUnique({
            where: { id: tripId },
            select: { updatedAt: true },
          });
          if (!trip) return;
          if (trip.updatedAt > lastKnown) {
            lastKnown = trip.updatedAt;
            send("update");
          }
        } catch {
          // silent — no cerrar la conexión por un error puntual
        }
      }, POLL_INTERVAL);

      // Heartbeat cada 30s para evitar timeout de proxies/Vercel
      const heartbeatInterval = setInterval(() => {
        send("ping");
      }, HEARTBEAT_INTERVAL);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
