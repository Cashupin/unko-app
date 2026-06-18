import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

const CURRENCIES = ["CLP", "JPY", "USD", "EUR", "GBP", "KRW", "CNY", "THB"] as const;
const TRANSPORT_TYPES = ["FLIGHT", "TRAIN", "BUS", "FERRY", "CAR"] as const;

async function requireMember(tripId: string, userId: string) {
  return prisma.tripParticipant.findFirst({
    where: { tripId, userId },
    select: { role: true },
  });
}

const createTransportSchema = z.object({
  origin: z.string().trim().min(1).max(300),
  destination: z.string().trim().min(1).max(300),
  type: z.enum(TRANSPORT_TYPES),
  departureDate: z.string().optional(),
  departureTime: z.string().optional(),
  arrivalDate: z.string().optional(),
  arrivalTime: z.string().optional(),
  cost: z.number().positive().optional(),
  currency: z.enum(CURRENCIES).optional(),
  isPaid: z.boolean().optional(),
  notes: z.string().trim().max(1000).optional(),
  coveredByPassId: z.string().optional(),
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

// ─── GET /api/trips/[id]/transports ──────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId } = await params;
  if (!(await requireMember(tripId, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const transports = await prisma.transport.findMany({
    where: { tripId },
    select: TRANSPORT_SELECT,
    orderBy: [{ departureDate: "asc" }, { departureTime: "asc" }],
  });

  return NextResponse.json({ transports });
}

// ─── POST /api/trips/[id]/transports ─────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId } = await params;
  const membership = await requireMember(tripId, session.user.id);
  if (!membership || membership.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = createTransportSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const {
    origin, destination, type,
    departureDate, departureTime,
    arrivalDate, arrivalTime,
    cost, currency, isPaid, notes, coveredByPassId,
  } = result.data;

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { defaultCurrency: true } });
  const resolvedCurrency = currency ?? trip?.defaultCurrency ?? "CLP";

  const transport = await prisma.transport.create({
    data: {
      tripId,
      origin,
      destination,
      type,
      departureDate: departureDate ? new Date(departureDate) : null,
      departureTime: departureTime ?? null,
      arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
      arrivalTime: arrivalTime ?? null,
      cost: cost ?? null,
      currency: resolvedCurrency,
      isPaid: isPaid ?? false,
      notes: notes ?? null,
      coveredByPassId: coveredByPassId ?? null,
    },
    select: TRANSPORT_SELECT,
  });

  broadcast(`trip:${tripId}`, "update");
  return NextResponse.json(transport, { status: 201 });
}
