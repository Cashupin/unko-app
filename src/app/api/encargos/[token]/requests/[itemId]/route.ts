import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Cancelar un pedido PENDING propio
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ token: string; itemId: string }> }
) {
  const { token, itemId } = await params;

  const link = await prisma.wishlistFriendLink.findUnique({
    where: { token },
    select: { id: true, revokedAt: true },
  });

  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (link.revokedAt) return NextResponse.json({ error: "Revoked" }, { status: 410 });

  // Puede cancelar si está PENDING, o si está APPROVED pero aún no comprado
  const item = await prisma.wishlistItem.findFirst({
    where: {
      id: itemId,
      friendLinkId: link.id,
      OR: [
        { requestStatus: "PENDING" },
        { requestStatus: "APPROVED", bought: false },
      ],
    },
    select: { id: true },
  });

  if (!item) return NextResponse.json({ error: "Not found or not cancellable" }, { status: 404 });

  await prisma.wishlistItem.delete({ where: { id: itemId } });

  return NextResponse.json({ ok: true });
}
