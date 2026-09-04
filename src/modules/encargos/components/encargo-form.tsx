"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";
import type { WishlistRequestStatus } from "@/modules/wishlist/types";

type AddedRequest = {
  id: string;
  name: string;
  notes: string | null;
  imageUrl: string | null;
  requestStatus: WishlistRequestStatus;
  createdAt: string;
};

type Props = {
  token: string;
  onAdded: (req: AddedRequest) => void;
};


export function EncargoForm({ token, onAdded }: Props) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const sigRes = await fetch(`/api/encargos/${token}/upload-signature`, { method: "POST" });
      if (!sigRes.ok) throw new Error("No se pudo obtener la firma");
      const { signature, timestamp, cloudName, apiKey, folder, allowedFormats } = await sigRes.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("signature", signature);
      formData.append("timestamp", String(timestamp));
      formData.append("api_key", apiKey);
      formData.append("folder", folder);
      formData.append("allowed_formats", allowedFormats);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!uploadRes.ok) {
        const body = await uploadRes.json().catch(() => ({}));
        throw new Error((body as { error?: { message?: string } }).error?.message ?? "La subida falló");
      }
      const data = await uploadRes.json();
      setImageUrl(data.secure_url);
    } catch {
      toast.error("Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/encargos/${token}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), notes: notes.trim() || null, imageUrl }),
      });

      if (!res.ok) throw new Error();

      const req = await res.json();
      onAdded(req);
      setName("");
      setNotes("");
      setImageUrl(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Pedido enviado");
    } catch {
      toast.error("Error al enviar el pedido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">
          Producto *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Crema Tatcha 150ml"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">
          Notas (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Talla, color, dónde comprarlo..."
          rows={2}
          className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">
          Foto de referencia (opcional)
        </label>
        {imageUrl ? (
          <div className="relative w-20 h-20">
            <Image fill src={imageUrl} alt="preview" className="rounded-lg object-cover border border-zinc-700" />
            <button
              type="button"
              onClick={() => { setImageUrl(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-600 text-white text-xs"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className={`flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-800 text-zinc-600 transition-colors hover:border-zinc-500 hover:text-zinc-400 ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
            {uploading ? (
              <span className="text-xs text-zinc-500">...</span>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            )}
          </label>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting || !name.trim()}
        className="mt-1 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:bg-orange-400 disabled:opacity-40"
      >
        {submitting ? "Enviando..." : "Enviar pedido"}
      </button>
    </form>
  );
}
