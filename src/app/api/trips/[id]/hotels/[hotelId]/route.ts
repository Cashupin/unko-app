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

// ─── DELETE /api/trips/[id]/hotels/[hotelId] ─────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; hotelId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId, hotelId } = await params;
  const membership = await requireMember(tripId, session.user.id);
  if (!membership || membership.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hotel = await prisma.hotel.findFirst({
    where: { id: hotelId, tripId },
    select: { id: true },
  });
  if (!hotel) {
    return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
  }

  await prisma.hotel.delete({ where: { id: hotelId } });
  return new NextResponse(null, { status: 204 });
}

const patchHotelSchema = z.object({
  reserved: z.boolean().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  link: z.string().url().optional().or(z.literal("")).optional(),
  checkInDate: z.string().min(1).optional(),
  checkOutDate: z.string().min(1).optional(),
  pricePerNight: z.number().positive().nullable().optional(),
  currency: z.enum(["CLP", "JPY", "USD", "EUR", "GBP", "KRW", "CNY", "THB"]).optional(),
  address: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

// ─── PATCH /api/trips/[id]/hotels/[hotelId] ──────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; hotelId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId, hotelId } = await params;
  const membership = await requireMember(tripId, session.user.id);
  if (!membership || membership.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hotel = await prisma.hotel.findFirst({
    where: { id: hotelId, tripId },
    select: { id: true },
  });
  if (!hotel) {
    return NextResponse.json({ error: "Alojamiento no encontrado" }, { status: 404 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = patchHotelSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { name, link, checkInDate, checkOutDate, pricePerNight, currency, address, notes, reserved } = result.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  if (reserved !== undefined) data.reserved = reserved;
  if (name !== undefined) data.name = name;
  if (link !== undefined) data.link = link || null;
  if (currency !== undefined) data.currency = currency;
  if (address !== undefined) data.address = address ?? null;
  if (notes !== undefined) data.notes = notes ?? null;
  if (pricePerNight !== undefined) data.pricePerNight = pricePerNight ?? null;

  if (checkInDate !== undefined || checkOutDate !== undefined) {
    // Need both to recalculate nights
    const current = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { checkInDate: true, checkOutDate: true },
    });
    const checkIn = new Date(checkInDate ?? current!.checkInDate);
    const checkOut = new Date(checkOutDate ?? current!.checkOutDate);
    if (checkOut <= checkIn) {
      return NextResponse.json({ error: "La fecha de salida debe ser posterior a la de entrada" }, { status: 400 });
    }
    const numberOfNights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const resolvedPrice = pricePerNight !== undefined ? (pricePerNight ?? null) : data.pricePerNight;
    data.checkInDate = checkIn;
    data.checkOutDate = checkOut;
    data.numberOfNights = numberOfNights;
    data.totalPrice = resolvedPrice != null ? resolvedPrice * numberOfNights : null;
  } else if (pricePerNight !== undefined) {
    // Recalculate totalPrice with existing nights
    const current = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { numberOfNights: true },
    });
    data.totalPrice = pricePerNight != null ? pricePerNight * current!.numberOfNights : null;
  }

  const updated = await prisma.hotel.update({
    where: { id: hotelId },
    data,
    select: {
      id: true, name: true, link: true,
      checkInDate: true, checkOutDate: true,
      pricePerNight: true, totalPrice: true, numberOfNights: true,
      currency: true, address: true, notes: true, reserved: true,
    },
  });

  return NextResponse.json(updated);
}
