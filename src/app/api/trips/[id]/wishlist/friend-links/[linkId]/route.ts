import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getMembership(tripId: string, userId: string) {
  return prisma.tripParticipant.findFirst({
    where: { tripId, userId },
    select: { id: true, role: true },
  });
}

// Revocar link
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId, linkId } = await params;
  const member = await getMembership(tripId, session.user.id!);
  if (!member || member.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const link = await prisma.wishlistFriendLink.findFirst({
    where: { id: linkId, tripId },
    select: { id: true, _count: { select: { requests: true } } },
  });
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (link._count.requests === 0) {
    // Sin productos — eliminar definitivamente
    await prisma.wishlistFriendLink.delete({ where: { id: linkId } });
    return NextResponse.json({ ok: true, deleted: true });
  }

  // Con productos — solo deshabilitar
  await prisma.wishlistFriendLink.update({
    where: { id: linkId },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true, deleted: false });
}

// Regenerar token
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId, linkId } = await params;
  const member = await getMembership(tripId, session.user.id!);
  if (!member || member.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const link = await prisma.wishlistFriendLink.findFirst({
    where: { id: linkId, tripId },
    select: { id: true },
  });
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Generar nuevo token usando cuid via Prisma (actualizar a uno nuevo)
  const { randomUUID } = await import("crypto");
  const newToken = randomUUID().replace(/-/g, "");

  const updated = await prisma.wishlistFriendLink.update({
    where: { id: linkId },
    data: { token: newToken, revokedAt: null },
    select: { token: true },
  });

  return NextResponse.json({ token: updated.token });
}
