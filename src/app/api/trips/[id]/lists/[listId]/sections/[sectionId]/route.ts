import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";
import { requireParticipant } from "../../../route";

const updateSectionSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

// ─── PATCH /api/trips/[id]/lists/[listId]/sections/[sectionId] ───────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; listId: string; sectionId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId, listId, sectionId } = await params;
  const participant = await requireParticipant(tripId, session.user.id);
  if (!participant || participant.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const section = await prisma.shoppingListSection.findFirst({
    where: { id: sectionId, listId, list: { tripId } },
    select: { id: true },
  });
  if (!section) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = updateSectionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const updated = await prisma.shoppingListSection.update({
    where: { id: sectionId },
    data: { title: result.data.title },
    select: { id: true, title: true, order: true },
  });

  broadcast(`trip:${tripId}`, "list:updated");
  return NextResponse.json(updated);
}

// ─── DELETE /api/trips/[id]/lists/[listId]/sections/[sectionId] ──────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; listId: string; sectionId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId, listId, sectionId } = await params;
  const participant = await requireParticipant(tripId, session.user.id);
  if (!participant || participant.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const section = await prisma.shoppingListSection.findFirst({
    where: { id: sectionId, listId, list: { tripId } },
    select: { id: true },
  });
  if (!section) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Los ítems de la sección quedan huérfanos (sectionId = null) por onDelete: SetNull
  await prisma.shoppingListSection.delete({ where: { id: sectionId } });
  broadcast(`trip:${tripId}`, "list:updated");
  return NextResponse.json({ ok: true });
}
