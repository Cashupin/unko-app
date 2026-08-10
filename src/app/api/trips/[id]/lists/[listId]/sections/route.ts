import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";
import { requireParticipant } from "../../route";

const createSectionSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

// ─── POST /api/trips/[id]/lists/[listId]/sections ─────────────────────────────

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

  const result = createSectionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const maxOrder = await prisma.shoppingListSection.aggregate({
    where: { listId },
    _max: { order: true },
  });

  const section = await prisma.shoppingListSection.create({
    data: {
      listId,
      title: result.data.title,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    select: { id: true, title: true, order: true, items: true },
  });

  broadcast(`trip:${tripId}`, "list:section_added");
  return NextResponse.json(section, { status: 201 });
}
