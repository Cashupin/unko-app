import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

// ─── POST /api/trips/[id]/wishlist/[itemId]/want ─────────────────────────────
// Crea una copia del item para el participante actual.
// Siempre apunta al root (si el source ya es copia, usa su originItemId).

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId, itemId } = await params;

  const participant = await prisma.tripParticipant.findFirst({
    where: { tripId, userId: session.user.id },
    select: { id: true, role: true },
  });
  if (!participant || participant.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Buscar el item source y resolver el root
  const source = await prisma.wishlistItem.findFirst({
    where: { id: itemId, tripId },
    select: { id: true, name: true, notes: true, imageUrl: true, originItemId: true, ownedByParticipantId: true },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // No puedes querer tu propio item
  if (source.ownedByParticipantId === participant.id) {
    return NextResponse.json({ error: "Ya es tuyo" }, { status: 400 });
  }

  const rootId = source.originItemId ?? source.id;

  // Verificar que no tengas ya una copia del mismo root
  const existing = await prisma.wishlistItem.findFirst({
    where: {
      tripId,
      ownedByParticipantId: participant.id,
      OR: [{ id: rootId }, { originItemId: rootId }],
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Ya lo tienes en tu wishlist" }, { status: 409 });
  }

  const copy = await prisma.wishlistItem.create({
    data: {
      tripId,
      ownedByParticipantId: participant.id,
      name: source.name,
      notes: source.notes,
      imageUrl: source.imageUrl,
      originItemId: rootId,
    },
    select: {
      id: true, tripId: true, name: true, notes: true, imageUrl: true,
      bought: true, boughtAt: true, createdAt: true, originItemId: true,
      ownedByParticipantId: true,
      ownedByParticipant: { select: { id: true, name: true } },
    },
  });

  broadcast(`trip:${tripId}`, "update");
  return NextResponse.json(copy, { status: 201 });
}

// ─── DELETE /api/trips/[id]/wishlist/[itemId]/want ───────────────────────────
// Elimina la copia del participante actual (solo si es copia, no el original).

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId, itemId } = await params;

  const participant = await prisma.tripParticipant.findFirst({
    where: { tripId, userId: session.user.id },
    select: { id: true },
  });
  if (!participant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Buscar la copia del participante en este grupo (root = itemId)
  const copy = await prisma.wishlistItem.findFirst({
    where: {
      tripId,
      ownedByParticipantId: participant.id,
      originItemId: itemId,
    },
    select: { id: true },
  });
  if (!copy) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.wishlistItem.delete({ where: { id: copy.id } });

  broadcast(`trip:${tripId}`, "update");
  return new NextResponse(null, { status: 204 });
}
