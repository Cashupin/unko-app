import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;

// ─── Delete helper ────────────────────────────────────────────────────────────
// Extracts the public_id from a Cloudinary URL and destroys the asset.
// Silently no-ops if url is empty or the public_id cannot be resolved.
export async function deleteCloudinaryImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  // URL format: .../upload/[v<timestamp>/]<public_id>.<ext>
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
  const publicId = match?.[1];
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (e) {
    console.error("Cloudinary delete failed:", publicId, e);
  }
}

// ─── Upload constraints ────────────────────────────────────────────────────────
// UPLOAD_MAX_FILE_SIZE is enforced client-side only (UX guard).
// Cloudinary does NOT include max_file_size in the signed parameter set,
// so it cannot be enforced via signature. For server-side enforcement,
// configure max_file_size in your Cloudinary upload preset instead.

export const UPLOAD_FOLDER = process.env.CLOUDINARY_FOLDER ?? "travel-checks";
export const UPLOAD_ALLOWED_FORMATS = "jpg,jpeg,png,webp";
export const UPLOAD_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — client-side limit

// ─── Signature generator ───────────────────────────────────────────────────────

export function generateUploadSignature(subfolder?: string) {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = subfolder ? `${UPLOAD_FOLDER}/${subfolder}` : UPLOAD_FOLDER;

  // Only signable params: folder, allowed_formats, timestamp.
  // max_file_size is intentionally excluded — Cloudinary omits it from
  // its own signature computation, so including it causes a mismatch.
  const paramsToSign = {
    folder,
    allowed_formats: UPLOAD_ALLOWED_FORMATS,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!,
  );

  return {
    signature,
    timestamp,
    folder,
    allowedFormats: UPLOAD_ALLOWED_FORMATS,
    maxFileSize: UPLOAD_MAX_FILE_SIZE, // returned for client-side validation only
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  };
}
