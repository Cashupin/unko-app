import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

const CURRENCIES = ["CLP", "JPY", "USD", "EUR", "GBP", "KRW", "CNY", "THB"] as const;

async function requireMember(tripId: string, userId: string) {
  return prisma.tripParticipant.findFirst({
    where: { tripId, userId },
    select: { role: true },
  });
}

const createPassSchema = z.object({
  name: z.string().trim().min(1).max(200),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  cost: z.number().positive().optional(),
  currency: z.enum(CURRENCIES).optional(),
  isPaid: z.boolean().optional(),
  notes: z.string().trim().max(1000).optional(),
});

const PASS_SELECT = {
  id: true, name: true, validFrom: true, validTo: true,
  cost: true, currency: true, isPaid: true, notes: true, createdAt: true,
  transports: { select: { id: true } },
} as const;

// ─── GET /api/trips/[id]/passes ───────────────────────────────────────────────

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

  const passes = await prisma.pass.findMany({
    where: { tripId },
    select: PASS_SELECT,
    orderBy: { validFrom: "asc" },
  });

  return NextResponse.json({ passes });
}

// ─── POST /api/trips/[id]/passes ──────────────────────────────────────────────

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

  const result = createPassSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { name, validFrom, validTo, cost, currency, isPaid, notes } = result.data;

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { defaultCurrency: true } });
  const resolvedCurrency = currency ?? trip?.defaultCurrency ?? "CLP";

  const pass = await prisma.pass.create({
    data: {
      tripId,
      name,
      validFrom: validFrom ? new Date(validFrom) : null,
      validTo: validTo ? new Date(validTo) : null,
      cost: cost ?? null,
      currency: resolvedCurrency,
      isPaid: isPaid ?? false,
      notes: notes ?? null,
    },
    select: PASS_SELECT,
  });

  broadcast(`trip:${tripId}`, "update");
  return NextResponse.json(pass, { status: 201 });
}
