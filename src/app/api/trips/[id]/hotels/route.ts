import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireMember(tripId: string, userId: string) {
  return prisma.tripParticipant.findFirst({
    where: { tripId, userId },
    select: { role: true },
  });
}

const createHotelSchema = z.object({
  name: z.string().trim().min(1).max(200),
  link: z.string().url().optional().or(z.literal("")),
  checkInDate: z.string().min(1),
  checkOutDate: z.string().min(1),
  pricePerNight: z.number().positive().optional(),
  currency: z.enum(["CLP", "JPY", "USD", "EUR", "GBP", "KRW", "CNY", "THB"]).optional(),
  address: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  reserved: z.boolean().optional(),
});

// ─── GET /api/trips/[id]/hotels ───────────────────────────────────────────────

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

  const hotels = await prisma.hotel.findMany({
    where: { tripId },
    select: {
      id: true, name: true, link: true,
      checkInDate: true, checkOutDate: true,
      pricePerNight: true, totalPrice: true, numberOfNights: true,
      currency: true, notes: true, createdAt: true,
    },
    orderBy: { checkInDate: "asc" },
  });

  return NextResponse.json({ hotels });
}

// ─── POST /api/trips/[id]/hotels ──────────────────────────────────────────────

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

  const result = createHotelSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { name, link, checkInDate, checkOutDate, pricePerNight, currency, address, notes, reserved } = result.data;

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  if (checkOut <= checkIn) {
    return NextResponse.json({ error: "La fecha de salida debe ser posterior a la de entrada" }, { status: 400 });
  }

  const numberOfNights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const totalPrice = pricePerNight != null ? pricePerNight * numberOfNights : null;

  // Get trip default currency if not provided
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { defaultCurrency: true } });
  const resolvedCurrency = currency ?? trip?.defaultCurrency ?? "CLP";

  const hotel = await prisma.hotel.create({
    data: {
      tripId,
      name,
      link: link || null,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      pricePerNight: pricePerNight ?? null,
      totalPrice,
      numberOfNights,
      currency: resolvedCurrency as "CLP" | "JPY" | "USD" | "EUR" | "GBP" | "KRW" | "CNY" | "THB",
      address: address ?? null,
      notes: notes ?? null,
      reserved: reserved ?? false,
    },
    select: {
      id: true, name: true, link: true,
      checkInDate: true, checkOutDate: true,
      pricePerNight: true, totalPrice: true, numberOfNights: true,
      currency: true, notes: true, createdAt: true,
    },
  });

  return NextResponse.json(hotel, { status: 201 });
}
