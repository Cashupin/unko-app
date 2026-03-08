import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const createInvitationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address")
    .max(254, "Email address is too long"),
  tripId: z.string().cuid().optional(),
  tripRole: z.enum(["EDITOR", "VIEWER"]).optional().default("VIEWER"),
});

export async function POST(req: NextRequest) {
  // ── Auth guard ──────────────────────────────────────────────────────────────
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Input validation ────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = createInvitationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 },
    );
  }

  const { email, tripId, tripRole } = result.data;

  // Cannot invite yourself
  if (email === session.user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "You cannot invite yourself" },
      { status: 400 },
    );
  }

  // ── Trip validation (when tripId provided) ──────────────────────────────────
  if (tripId) {
    const callerMembership = await prisma.tripParticipant.findFirst({
      where: { tripId, userId: session.user.id, role: "ADMIN" },
      select: { id: true },
    });
    if (!callerMembership) {
      return NextResponse.json(
        { error: "Solo los administradores pueden invitar al viaje" },
        { status: 403 },
      );
    }
  }

  // ── Business rules ──────────────────────────────────────────────────────────

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, status: true },
  });

  if (existingUser?.status === "ACTIVE") {
    // If this is a trip invitation and the user is already active,
    // they should be added directly via the participants endpoint
    if (tripId) {
      return NextResponse.json(
        { error: "Este usuario ya tiene cuenta. Agrégalo directamente desde el panel de participantes.", alreadyActive: true },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "This user already has access" },
      { status: 409 },
    );
  }

  const activeInvitation = await prisma.invitation.findFirst({
    where: {
      email,
      status: "PENDING",
      expiresAt: { gt: new Date() },
      // For trip invitations, only block duplicates for the same trip
      ...(tripId ? { tripId } : { tripId: null }),
    },
  });

  if (activeInvitation) {
    return NextResponse.json(
      { error: tripId
          ? "Ya existe una invitación pendiente para este email en este viaje"
          : "A pending invitation already exists for this email"
      },
      { status: 409 },
    );
  }

  // ── Create invitation ───────────────────────────────────────────────────────
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.invitation.create({
    data: {
      email,
      invitedById: session.user.id,
      expiresAt,
      ...(tripId ? { tripId, tripRole } : {}),
    },
    select: {
      id: true,
      email: true,
      token: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      invitedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  logger.info("invitation.created", {
    invitationId: invitation.id,
    email,
    invitedBy: session.user.id,
    expiresAt: expiresAt.toISOString(),
  });

  return NextResponse.json(invitation, { status: 201 });
}
