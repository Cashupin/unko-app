import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

const CURRENCIES = ["CLP", "JPY", "USD", "EUR", "GBP", "KRW", "CNY", "THB"] as const;
const TRANSPORT_TYPES = ["FLIGHT", "TRAIN", "BUS", "FERRY", "CAR"] as const;

const updateTransportSchema = z.object({
  origin: z.string().trim().min(1).max(300).optional(),
  destination: z.string().trim().min(1).max(300).optional(),
  type: z.enum(TRANSPORT_TYPES).optional(),
  departureDate: z.string().nullable().optional(),
  departureTime: z.string().nullable().optional(),
  arrivalDate: z.string().nullable().optional(),
  arrivalTime: z.string().nullable().optional(),
  cost: z.number().positive().nullable().optional(),
  currency: z.enum(CURRENCIES).optional(),
  isPaid: z.boolean().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  coveredByPassId: z.string().nullable().optional(),
});

const TRANSPORT_SELECT = {
  id: true, origin: true, destination: true, type: true,
  departureDate: true, departureTime: true,
  arrivalDate: true, arrivalTime: true,
  cost: true, currency: true, isPaid: true, notes: true,
  coveredByPassId: true,
  coveredByPass: { select: { id: true, name: true } },
  createdAt: true,
} as const;

async function requireEditorForTransport(transportId: string, userId: string) {
  const transport = await prisma.transport.findUnique({
    where: { id: transportId },
    select: { tripId: true },
  });
  if (!transport) return null;
  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId: transport.tripId, userId },
    select: { role: true },
  });
  if (!membership || membership.role === "VIEWER") return null;
  return transport;
}

// ─── PATCH /api/transports/[transportId] ──────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ transportId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { transportId } = await params;
  const transport = await requireEditorForTransport(transportId, session.user.id);
  if (!transport) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = updateTransportSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const d = result.data;
  const updated = await prisma.transport.update({
    where: { id: transportId },
    data: {
      ...(d.origin !== undefined && { origin: d.origin }),
      ...(d.destination !== undefined && { destination: d.destination }),
      ...(d.type !== undefined && { type: d.type }),
      ...(d.departureDate !== undefined && { departureDate: d.departureDate ? new Date(d.departureDate) : null }),
      ...(d.departureTime !== undefined && { departureTime: d.departureTime }),
      ...(d.arrivalDate !== undefined && { arrivalDate: d.arrivalDate ? new Date(d.arrivalDate) : null }),
      ...(d.arrivalTime !== undefined && { arrivalTime: d.arrivalTime }),
      ...(d.cost !== undefined && { cost: d.cost }),
      ...(d.currency !== undefined && { currency: d.currency }),
      ...(d.isPaid !== undefined && { isPaid: d.isPaid }),
      ...(d.notes !== undefined && { notes: d.notes }),
      ...(d.coveredByPassId !== undefined && { coveredByPassId: d.coveredByPassId }),
    },
    select: TRANSPORT_SELECT,
  });

  broadcast(`trip:${transport.tripId}`, "update");
  return NextResponse.json(updated);
}

// ─── DELETE /api/transports/[transportId] ─────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ transportId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { transportId } = await params;
  const transport = await requireEditorForTransport(transportId, session.user.id);
  if (!transport) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.transport.delete({ where: { id: transportId } });

  broadcast(`trip:${transport.tripId}`, "update");
  return new NextResponse(null, { status: 204 });
}
