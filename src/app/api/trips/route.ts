import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

async function requireActiveSession() {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") return null;
  return session;
}

// ─── Validation ────────────────────────────────────────────────────────────────

const createTripSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(50, "El nombre no puede tener más de 50 caracteres"),
  description: z.string().trim().max(1000).optional(),
  destination: z.string().trim().max(500).optional(),
  startDate: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  endDate: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  defaultCurrency: z
    .enum(["CLP", "JPY", "USD", "EUR", "GBP", "KRW", "CNY", "THB"])
    .optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
});

// ─── GET /api/trips ────────────────────────────────────────────────────────────

export async function GET() {
  const session = await requireActiveSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const participations = await prisma.tripParticipant.findMany({
    where: {
      userId: session.user.id,
      trip: { isStandaloneGroup: false },
    },
    select: {
      role: true,
      trip: {
        select: {
          id: true,
          name: true,
          description: true,
          destination: true,
          startDate: true,
          endDate: true,
          defaultCurrency: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true, image: true } },
          _count: { select: { participants: true, items: true } },
        },
      },
    },
    orderBy: { trip: { createdAt: "desc" } },
  });

  const trips = participations.map(({ role, trip }) => ({ ...trip, myRole: role }));

  return NextResponse.json({ trips });
}

// ─── POST /api/trips ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await requireActiveSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = createTripSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 },
    );
  }

  const { name, description, destination, startDate, endDate, defaultCurrency, coverImageUrl } =
    result.data;

  const userId = session.user.id;

  const trip = await prisma.$transaction(async (tx) => {
    const newTrip = await tx.trip.create({
      data: {
        name,
        description: description ?? null,
        destination: destination ?? null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        defaultCurrency: defaultCurrency ?? "CLP",
        coverImageUrl: coverImageUrl || null,
        createdById: userId,
      },
    });

    // Creator becomes ADMIN participant automatically
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    await tx.tripParticipant.create({
      data: {
        tripId: newTrip.id,
        userId,
        name: user?.name ?? user?.email ?? userId,
        type: "REGISTERED",
        role: "ADMIN",
      },
    });

    return newTrip;
  });

  logger.info("trip.created", { tripId: trip.id, userId });

  return NextResponse.json(trip, { status: 201 });
}
