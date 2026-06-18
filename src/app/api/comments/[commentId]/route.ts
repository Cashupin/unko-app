import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

// ─── DELETE /api/comments/[commentId] ──────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { commentId } = await params;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true, item: { select: { tripId: true } } },
  });
  if (!comment) {
    return NextResponse.json({ error: "Comentario no encontrado" }, { status: 404 });
  }

  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId: comment.item.tripId, userId: session.user.id },
    select: { role: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isAuthor = comment.userId === session.user.id;
  const isAdmin = membership.role === "ADMIN";
  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Solo el autor o un admin puede eliminar este comentario" }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id: commentId } });
  broadcast(`trip:${comment.item.tripId}`, "update");
  return new NextResponse(null, { status: 204 });
}
