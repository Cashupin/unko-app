import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

const claimSchema = z.object({
  userId: z.string().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: itemId } = await params;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, tripId: true, createdById: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  }

  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId: item.tripId, userId: session.user.id },
    select: { role: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = claimSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { userId } = result.data;
  const isAdmin = membership.role === "ADMIN";
  const isEditor = membership.role === "EDITOR";

  // Claiming self: item must have no owner, user must be EDITOR or ADMIN
  if (userId === session.user.id) {
    if (item.createdById !== null) {
      return NextResponse.json({ error: "Este ítem ya tiene un propietario" }, { status: 409 });
    }
    if (!isEditor && !isAdmin) {
      return NextResponse.json({ error: "Solo editores y admins pueden adjudicarse ítems" }, { status: 403 });
    }
  } else {
    // Assigning to someone else or unassigning (null): admin only
    if (!isAdmin) {
      return NextResponse.json({ error: "Solo los admins pueden asignar o desasignar ítems" }, { status: 403 });
    }
    // Verify target user is a participant (if not null)
    if (userId !== null) {
      const targetMembership = await prisma.tripParticipant.findFirst({
        where: { tripId: item.tripId, userId },
        select: { id: true },
      });
      if (!targetMembership) {
        return NextResponse.json({ error: "El usuario no es participante del viaje" }, { status: 404 });
      }
    }
  }

  await prisma.item.update({
    where: { id: itemId },
    data: { createdById: userId },
  });

  broadcast(`trip:${item.tripId}`, "update");
  return NextResponse.json({ ok: true });
}
