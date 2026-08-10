import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";
import { requireParticipant } from "../../../route";

const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});

// ─── PATCH /api/trips/[id]/lists/[listId]/sections/reorder ───────────────────

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

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = reorderSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  await prisma.$transaction(
    result.data.ids.map((id, index) =>
      prisma.shoppingListSection.updateMany({
        where: { id, listId },
        data: { order: index },
      })
    )
  );

  broadcast(`trip:${tripId}`, "list:reordered");
  return NextResponse.json({ ok: true });
}
