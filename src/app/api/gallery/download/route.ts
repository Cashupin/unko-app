import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import cloudinary from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { urls: string[]; tripName: string };
  const { urls, tripName } = body;

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: "No se proporcionaron fotos" }, { status: 400 });
  }

  // Extract public_ids from Cloudinary URLs
  // URL format: .../upload/[v<timestamp>/]<public_id>.<ext>
  const publicIds = urls.flatMap((url) => {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    return match?.[1] ? [match[1]] : [];
  });

  if (publicIds.length === 0) {
    return NextResponse.json({ error: "URLs inválidas" }, { status: 400 });
  }

  const safeName = tripName.trim().replace(/[^a-zA-Z0-9\-_áéíóúüñÁÉÍÓÚÜÑ ]/g, "").trim() || "galeria";

  const zipUrl = cloudinary.utils.download_zip_url({
    public_ids: publicIds,
    target_public_id: safeName,
    resource_type: "image",
  });

  return NextResponse.json({ url: zipUrl });
}
