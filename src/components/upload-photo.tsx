"use client";

import { useRef, useState } from "react";

// Must mirror UPLOAD_ALLOWED_FORMATS and UPLOAD_MAX_FILE_SIZE from lib/cloudinary.ts.
// These are also enforced server-side via the signature — client values are UX only.
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface SignatureResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  allowedFormats: string;
  maxFileSize: number;
}

interface UploadPhotoProps {
  onUpload: (secureUrl: string) => void;
  disabled?: boolean;
  label?: string;
  subfolder?: string;
}

export function UploadPhoto({
  onUpload,
  disabled = false,
  label = "Subir foto",
  subfolder,
}: UploadPhotoProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);

    // ── Client-side validation (UX) ──────────────────────────────────────────
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError(`Tipo no permitido. Usa JPG, PNG o WEBP.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`El archivo supera el límite de ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setUploading(true);
    try {
      // 1. Request a fresh signature from our backend
      const sigRes = await fetch("/api/upload/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subfolder }),
      });
      if (!sigRes.ok) {
        throw new Error("No se pudo obtener la firma de subida.");
      }
      const sig: SignatureResponse = await sigRes.json();

      // 2. Upload directly to Cloudinary — API secret never touches the client
      const form = new FormData();
      form.append("file", file);
      form.append("signature", sig.signature);
      form.append("timestamp", String(sig.timestamp));
      form.append("api_key", sig.apiKey);
      form.append("folder", sig.folder);
      form.append("allowed_formats", sig.allowedFormats);
      // max_file_size is NOT sent — it's not a signable Cloudinary param.
      // File size is validated client-side above.

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: "POST", body: form },
      );

      if (!uploadRes.ok) {
        const body = await uploadRes.json().catch(() => ({}));
        throw new Error(
          (body as { error?: { message?: string } }).error?.message ??
            "La subida falló.",
        );
      }

      const { secure_url } = (await uploadRes.json()) as { secure_url: string };

      onUpload(secure_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected if needed
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Gallery input — no capture, works on all devices */}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {/* Camera input — capture="environment", only triggered on mobile */}
      <input
        ref={cameraRef}
        type="file"
        accept={ALLOWED_MIME_TYPES.join(",")}
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
        >
          {uploading ? "Subiendo..." : label}
        </button>
        {/* Camera button — only visible on mobile (hidden on md+) */}
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={disabled || uploading}
          title="Tomar foto"
          className="md:hidden rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-700 dark:hover:bg-zinc-600"
        >
          📷
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
