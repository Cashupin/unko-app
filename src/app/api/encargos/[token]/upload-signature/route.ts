import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateUploadSignature } from "@/lib/cloudinary";

// Endpoint público para firmar uploads de Cloudinary desde la página de encargos.
// El token actúa como auth — solo links activos pueden subir imágenes.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const link = await prisma.wishlistFriendLink.findUnique({
    where: { token },
    select: { id: true, tripId: true, revokedAt: true },
  });

  if (!link || link.revokedAt) {
    return NextResponse.json({ error: "Invalid link" }, { status: 403 });
  }

  const signaturePayload = generateUploadSignature(`${link.tripId}/wishlist`);
  return NextResponse.json(signaturePayload);
}
