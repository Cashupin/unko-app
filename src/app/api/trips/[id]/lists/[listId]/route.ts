import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";
import { requireParticipant } from "../route";

const updateListSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  emoji: z.string().trim().max(10).nullable().optional(),
  visibility: z.enum(["PRIVATE", "TRIP"]).optional(),
});

async function getListAndVerify(listId: string, tripId: string, participantId: string) {
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { id: true, tripId: true, createdByParticipantId: true, visibility: true },
  });
  if (!list || list.tripId !== tripId) return null;
  return list;
}

// ─── PATCH /api/trips/[id]/lists/[listId] ────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; listId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId, listId } = await params;
  const participant = await requireParticipant(tripId, session.user.id);
  if (!participant || participant.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const list = await getListAndVerify(listId, tripId, participant.id);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Solo el creador puede editar una lista privada
  if (list.visibility === "PRIVATE" && list.createdByParticipantId !== participant.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = updateListSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const updated = await prisma.shoppingList.update({
    where: { id: listId },
    data: {
      ...(result.data.title !== undefined && { title: result.data.title }),
      ...(result.data.emoji !== undefined && { emoji: result.data.emoji }),
      ...(result.data.visibility !== undefined && { visibility: result.data.visibility }),
    },
    select: { id: true, title: true, emoji: true, visibility: true, order: true },
  });

  broadcast(`trip:${tripId}`, "list:updated");
  return NextResponse.json(updated);
}

// ─── DELETE /api/trips/[id]/lists/[listId] ───────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; listId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId, listId } = await params;
  const participant = await requireParticipant(tripId, session.user.id);
  if (!participant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const list = await getListAndVerify(listId, tripId, participant.id);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Solo el creador o un admin puede eliminar
  const isCreator = list.createdByParticipantId === participant.id;
  const isAdmin = participant.role === "ADMIN";
  if (!isCreator && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.shoppingList.delete({ where: { id: listId } });
  broadcast(`trip:${tripId}`, "list:deleted");
  return NextResponse.json({ ok: true });
}
