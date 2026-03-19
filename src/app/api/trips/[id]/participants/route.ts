import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createNotification } from "@/modules/notifications/lib/notifications";

async function requireActiveSession() {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") return null;
  return session;
}

const addRegisteredSchema = z.object({
  type: z.literal("REGISTERED").optional().default("REGISTERED"),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  role: z.enum(["EDITOR", "VIEWER"]).optional().default("VIEWER"),
});

const addGhostSchema = z.object({
  type: z.literal("GHOST"),
  name: z.string().trim().min(1).max(100),
  role: z.enum(["EDITOR", "VIEWER"]).optional().default("VIEWER"),
});

const addParticipantSchema = z.discriminatedUnion("type", [
  addRegisteredSchema,
  addGhostSchema,
]);

// ─── GET /api/trips/[id]/participants ──────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireActiveSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tripId } = await params;

  // Verify the caller is a member
  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId, userId: session.user.id },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this trip" }, { status: 403 });
  }

  const participants = await prisma.tripParticipant.findMany({
    where: { tripId },
    select: {
      id: true,
      name: true,
      type: true,
      role: true,
      joinedAt: true,
      user: { select: { id: true, name: true, image: true, email: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json({ participants });
}

// ─── POST /api/trips/[id]/participants ─────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireActiveSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tripId } = await params;

  // Verify caller is ADMIN of this trip
  const callerMembership = await prisma.tripParticipant.findFirst({
    where: { tripId, userId: session.user.id, role: "ADMIN" },
    select: { id: true },
  });
  if (!callerMembership) {
    return NextResponse.json(
      { error: "Solo los administradores pueden agregar participantes" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Default to REGISTERED if type not provided
  const bodyWithDefault = typeof body === "object" && body !== null && !("type" in body)
    ? { ...body, type: "REGISTERED" }
    : body;

  const result = addParticipantSchema.safeParse(bodyWithDefault);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 },
    );
  }

  const { role } = result.data;

  // ── Ghost participant ──────────────────────────────────────────────────────
  if (result.data.type === "GHOST") {
    const { name } = result.data;
    const participant = await prisma.tripParticipant.create({
      data: {
        tripId,
        userId: null,
        name,
        type: "GHOST",
        role,
      },
      select: {
        id: true,
        name: true,
        type: true,
        role: true,
        joinedAt: true,
        user: { select: { id: true, name: true, image: true, email: true } },
      },
    });

    logger.info("trip.participant.ghost.added", { tripId, name, addedBy: session.user.id });
    return NextResponse.json(participant, { status: 201 });
  }

  // ── Registered participant ─────────────────────────────────────────────────
  const { email } = result.data;

  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, status: true },
  });

  if (!targetUser) {
    return NextResponse.json(
      { error: "No existe ningún usuario con ese email.", notInSystem: true },
      { status: 404 },
    );
  }

  if (targetUser.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "El usuario no tiene una cuenta activa" },
      { status: 400 },
    );
  }

  if (targetUser.id === session.user.id) {
    return NextResponse.json(
      { error: "Ya eres participante de este viaje" },
      { status: 409 },
    );
  }

  const existing = await prisma.tripParticipant.findFirst({
    where: { tripId, userId: targetUser.id },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Este usuario ya es participante del viaje" },
      { status: 409 },
    );
  }

  const participant = await prisma.tripParticipant.create({
    data: {
      tripId,
      userId: targetUser.id,
      name: targetUser.name ?? targetUser.email,
      type: "REGISTERED",
      role,
    },
    select: {
      id: true,
      name: true,
      type: true,
      role: true,
      joinedAt: true,
      user: { select: { id: true, name: true, image: true, email: true } },
    },
  });

  logger.info("trip.participant.added", {
    tripId,
    addedUserId: targetUser.id,
    role,
    addedBy: session.user.id,
  });

  // Notificación al usuario agregado (fire-and-forget)
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { name: true } });
  createNotification({
    userId: targetUser.id,
    type: "TRIP_ADDED",
    title: `Te agregaron al viaje "${trip?.name ?? "un viaje"}"`,
    body: `${session.user.name ?? "Alguien"} te agregó como participante.`,
    link: `/trips/${tripId}`,
  }).catch(() => {});

  return NextResponse.json(participant, { status: 201 });
}
