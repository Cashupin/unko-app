import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateUploadSignature } from "@/lib/cloudinary";

// POST /api/upload/signature
//
// Generates a short-lived Cloudinary upload signature.
// The API secret never leaves the server — the client only receives
// the HMAC signature, which is useless without the secret.
//
// The signed params (folder, allowed_formats, max_file_size, timestamp)
// are enforced by Cloudinary: an upload that doesn't match them is rejected.

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { subfolder?: string };
  const subfolder = typeof body.subfolder === "string" ? body.subfolder : undefined;

  const signaturePayload = generateUploadSignature(subfolder);

  return NextResponse.json(signaturePayload);
}
