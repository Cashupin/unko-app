"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadPhoto } from "@/components/upload-photo";
import type { CheckSummary } from "@/types/item";

interface CheckInButtonProps {
  itemId: string;
  myCheck: CheckSummary | null;
}

export function CheckInButton({ itemId, myCheck }: CheckInButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const alreadyChecked = myCheck !== null;

  async function submit(photoUrl?: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/items/${itemId}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(photoUrl ? { photoUrl } : {}),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Error al registrar la visita");
        return;
      }
      setOpen(false);
      setPendingUrl(null);
      router.refresh();
      toast.success(alreadyChecked ? "Foto actualizada" : "Visita registrada");
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Main trigger */}
      <button
        onClick={() => {
          setOpen((v) => !v);
          setPendingUrl(null);
        }}
        className={`w-full rounded-xl py-3 text-sm font-bold transition-colors ${
          alreadyChecked
            ? "border border-[#3f3f46] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
            : "bg-emerald-500 text-zinc-900 hover:bg-emerald-400"
        }`}
      >
        {alreadyChecked ? "✓ Actualizar foto" : "✓ Registrar mi visita"}
      </button>

      {/* Inline panel */}
      {open && (
        <div className="rounded-xl border border-[#3f3f46] bg-[#27272a] p-3 flex flex-col gap-3">
          {pendingUrl && (
            <Image
              src={pendingUrl}
              alt="Vista previa"
              width={80}
              height={80}
              className="rounded-lg object-cover"
            />
          )}

          <UploadPhoto
            label={pendingUrl ? "Cambiar foto" : "Subir foto (opcional)"}
            onUpload={(url) => setPendingUrl(url)}
            disabled={saving}
          />

          <div className="flex gap-2">
            <button
              onClick={() => submit(pendingUrl ?? undefined)}
              disabled={saving}
              className="flex-1 rounded-lg bg-emerald-500 py-2 text-xs font-bold text-zinc-900 hover:bg-emerald-400 disabled:opacity-50 transition-colors"
            >
              {saving ? "Guardando..." : alreadyChecked ? "Actualizar" : "Confirmar visita"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setPendingUrl(null);
              }}
              disabled={saving}
              className="rounded-lg border border-[#3f3f46] px-3 py-2 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
