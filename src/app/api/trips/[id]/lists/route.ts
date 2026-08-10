import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

export async function requireParticipant(tripId: string, userId: string) {
  return prisma.tripParticipant.findFirst({
    where: { tripId, userId },
    select: { id: true, role: true },
  });
}

const ITEM_SELECT = {
  id: true,
  listId: true,
  sectionId: true,
  text: true,
  notes: true,
  checked: true,
  checkedAt: true,
  order: true,
  checkedByParticipant: { select: { id: true, name: true } },
} as const;

const createListSchema = z.object({
  title: z.string().trim().min(1).max(200),
  emoji: z.string().trim().max(10).optional(),
  visibility: z.enum(["PRIVATE", "TRIP"]).default("TRIP"),
});

// ─── GET /api/trips/[id]/lists ────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId } = await params;
  const participant = await requireParticipant(tripId, session.user.id);
  if (!participant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const lists = await prisma.shoppingList.findMany({
    where: {
      tripId,
      OR: [
        { visibility: "TRIP" },
        { visibility: "COLLABORATIVE" },
        { visibility: "PRIVATE", createdByParticipantId: participant.id },
      ],
    },
    select: {
      id: true,
      title: true,
      emoji: true,
      visibility: true,
      order: true,
      createdByParticipant: { select: { id: true, name: true } },
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          items: { orderBy: { order: "asc" }, select: ITEM_SELECT },
        },
      },
      items: {
        where: { sectionId: null },
        orderBy: { order: "asc" },
        select: ITEM_SELECT,
      },
    },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ lists });
}

// ─── POST /api/trips/[id]/lists ───────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId } = await params;
  const participant = await requireParticipant(tripId, session.user.id);
  if (!participant || participant.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = createListSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const maxOrder = await prisma.shoppingList.aggregate({
    where: { tripId },
    _max: { order: true },
  });

  const list = await prisma.shoppingList.create({
    data: {
      tripId,
      title: result.data.title,
      emoji: result.data.emoji ?? null,
      visibility: result.data.visibility,
      createdByParticipantId: participant.id,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    select: {
      id: true,
      title: true,
      emoji: true,
      visibility: true,
      order: true,
      createdByParticipant: { select: { id: true, name: true } },
      sections: true,
      items: true,
    },
  });

  broadcast(`trip:${tripId}`, "list:created");
  return NextResponse.json(list, { status: 201 });
}
