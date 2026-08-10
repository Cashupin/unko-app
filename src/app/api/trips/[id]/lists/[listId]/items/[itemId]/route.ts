import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";
import { requireParticipant } from "../../../route";

const updateItemSchema = z.object({
  text: z.string().trim().min(1).max(500).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  checked: z.boolean().optional(),
  sectionId: z.string().nullable().optional(),
});

// ─── PATCH /api/trips/[id]/lists/[listId]/items/[itemId] ─────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; listId: string; itemId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId, listId, itemId } = await params;
  const participant = await requireParticipant(tripId, session.user.id);
  if (!participant || participant.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const item = await prisma.shoppingListItem.findFirst({
    where: { id: itemId, listId, list: { tripId } },
    select: { id: true, checked: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = updateItemSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { checked, text, notes, sectionId } = result.data;

  const updated = await prisma.shoppingListItem.update({
    where: { id: itemId },
    data: {
      ...(text !== undefined && { text }),
      ...(notes !== undefined && { notes }),
      ...(sectionId !== undefined && { sectionId }),
      ...(checked !== undefined && {
        checked,
        checkedAt: checked ? new Date() : null,
        checkedByParticipantId: checked ? participant.id : null,
      }),
    },
    select: {
      id: true,
      listId: true,
      sectionId: true,
      text: true,
      notes: true,
      checked: true,
      checkedAt: true,
      order: true,
      checkedByParticipant: { select: { id: true, name: true } },
    },
  });

  broadcast(`trip:${tripId}`, "list:item_checked");
  return NextResponse.json(updated);
}

// ─── DELETE /api/trips/[id]/lists/[listId]/items/[itemId] ────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; listId: string; itemId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId, listId, itemId } = await params;
  const participant = await requireParticipant(tripId, session.user.id);
  if (!participant || participant.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const item = await prisma.shoppingListItem.findFirst({
    where: { id: itemId, listId, list: { tripId } },
    select: { id: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.shoppingListItem.delete({ where: { id: itemId } });
  broadcast(`trip:${tripId}`, "list:item_deleted");
  return NextResponse.json({ ok: true });
}
