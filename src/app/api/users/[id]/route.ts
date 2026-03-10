import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ─── Validation ────────────────────────────────────────────────────────────────
// Only DISABLED and DELETED are allowed.
// ACTIVE is set exclusively by the invitation acceptance flow.

const updateUserSchema = z.object({
  status: z.enum(["DISABLED", "DELETED"]),
});

// ─── PATCH /api/users/[id] ─────────────────────────────────────────────────────
//
// Changes a user's status to DISABLED or DELETED.
// Triggers recalculation of all PENDING items atomically, because removing an
// active user lowers the threshold (ceil(n/2)) and could push items over it.

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── Auth guard ───────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: targetUserId } = await params;

  // Cannot change your own status — prevents accidental self-lockout
  if (targetUserId === session.user.id) {
    logger.warn("user.status.self_change_attempt", { userId: session.user.id });
    return NextResponse.json(
      { error: "You cannot change your own status" },
      { status: 400 },
    );
  }

  // ── Input validation ─────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = updateUserSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 },
    );
  }

  const { status: newStatus } = result.data;

  // ── Business rules ────────────────────────────────────────────────────────────
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, name: true, status: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (targetUser.status === "DELETED") {
    return NextResponse.json(
      { error: "User is already deleted" },
      { status: 409 },
    );
  }

  if (targetUser.status === newStatus) {
    return NextResponse.json(
      { error: `User is already ${newStatus.toLowerCase()}` },
      { status: 409 },
    );
  }

  const output = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: targetUserId },
      data: { status: newStatus },
      select: { id: true, email: true, name: true, status: true },
    });

    return { user: updatedUser };
  });

  logger.info("user.status.changed", {
    targetUserId,
    from: targetUser.status,
    to: newStatus,
    by: session.user.id,
  });

  return NextResponse.json(output);
}
