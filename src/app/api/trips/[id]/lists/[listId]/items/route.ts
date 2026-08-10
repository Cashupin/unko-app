import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";
import { requireParticipant } from "../../route";

const createItemSchema = z.object({
  text: z.string().trim().min(1).max(500),
  notes: z.string().trim().max(2000).optional(),
  sectionId: z.string().optional(),
});

// ─── POST /api/trips/[id]/lists/[listId]/items ────────────────────────────────

export async function POST(
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

  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, tripId },
    select: { id: true },
  });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = createItemSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { text, notes, sectionId } = result.data;

  const maxOrder = await prisma.shoppingListItem.aggregate({
    where: { listId, sectionId: sectionId ?? null },
    _max: { order: true },
  });

  const item = await prisma.shoppingListItem.create({
    data: {
      listId,
      sectionId: sectionId ?? null,
      text,
      notes: notes ?? null,
      order: (maxOrder._max.order ?? -1) + 1,
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

  broadcast(`trip:${tripId}`, "list:item_added");
  return NextResponse.json(item, { status: 201 });
}
