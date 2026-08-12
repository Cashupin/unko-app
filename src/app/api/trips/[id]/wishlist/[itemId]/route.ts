import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

async function requireOwner(itemId: string, participantId: string) {
  return prisma.wishlistItem.findFirst({
    where: { id: itemId, ownedByParticipantId: participantId },
    select: { id: true, tripId: true, name: true },
  });
}

const ITEM_SELECT = {
  id: true, tripId: true, name: true, notes: true, imageUrl: true,
  bought: true, boughtAt: true, cost: true, originItemId: true, createdAt: true,
  ownedByParticipantId: true,
  ownedByParticipant: { select: { id: true, name: true } },
} as const;

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  toggleBought: z.boolean().optional(),
  cost: z.number().nonnegative().optional().nullable(),
});

// ─── PATCH /api/trips/[id]/wishlist/[itemId] ─────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId, itemId } = await params;

  const participant = await prisma.tripParticipant.findFirst({
    where: { tripId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!participant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown = {};
  try { body = await req.json(); } catch { /* body vacío = toggle bought */ }

  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { toggleBought, name, notes, imageUrl } = result.data;

  // toggleBought: cualquier participante puede marcar comprado (encargos incluidos)
  // editar nombre/notas/imagen: solo el owner del item
  const item = toggleBought
    ? await prisma.wishlistItem.findFirst({ where: { id: itemId, tripId }, select: { id: true, tripId: true, name: true } })
    : await requireOwner(itemId, participant.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let data: Record<string, unknown> = {};

  if (toggleBought !== undefined) {
    const current = await prisma.wishlistItem.findUnique({ where: { id: itemId }, select: { bought: true } });
    const markingBought = !current?.bought;
    data = {
      bought: markingBought,
      boughtAt: markingBought ? new Date() : null,
      cost: markingBought ? (result.data.cost ?? null) : null,
    };
  } else {
    if (name !== undefined) data.name = name;
    if (notes !== undefined) data.notes = notes ?? null;
    if (imageUrl !== undefined) data.imageUrl = imageUrl || null;
  }

  const updated = await prisma.wishlistItem.update({
    where: { id: itemId },
    data,
    select: ITEM_SELECT,
  });

  const action = toggleBought !== undefined ? (updated.bought ? "bought" : "unbought") : "updated";
  broadcast(`trip:${tripId}`, "update", { type: "wishlist", actorId: participant.id, actorName: participant.name, action, itemName: updated.name });
  return NextResponse.json(updated);
}

// ─── DELETE /api/trips/[id]/wishlist/[itemId] ────────────────────────────────

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
    select: { id: true, name: true },
  });
  if (!participant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const item = await requireOwner(itemId, participant.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.wishlistItem.delete({ where: { id: itemId } });

  broadcast(`trip:${tripId}`, "update", { type: "wishlist", actorId: participant.id, actorName: participant.name, action: "deleted", itemName: item.name });
  return new NextResponse(null, { status: 204 });
}
