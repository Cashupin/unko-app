import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

const createCommentSchema = z.object({
  text: z.string().trim().min(1, "El comentario no puede estar vacío").max(2000),
});

const commentSelect = {
  id: true,
  text: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  user: { select: { id: true, name: true, image: true } },
} as const;

// ─── POST /api/items/[id]/comments ─────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: itemId } = await params;
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = createCommentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { text } = result.data;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, tripId: true },
  });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId: item.tripId, userId },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const comment = await prisma.comment.create({
    data: { userId, itemId, text },
    select: commentSelect,
  });

  broadcast(`trip:${item.tripId}`, "update");
  return NextResponse.json(comment, { status: 201 });
}
