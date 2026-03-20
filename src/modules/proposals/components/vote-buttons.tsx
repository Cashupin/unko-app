"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface VoteButtonsProps {
  itemId: string;
  myVote: "APPROVE" | "REJECT" | null;
  approvals: number;
  rejections: number;
}

export function VoteButtons({ itemId, myVote, approvals, rejections }: VoteButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVE" | "REJECT" | null>(null);

  async function vote(value: "APPROVE" | "REJECT") {
    setLoading(value);
    try {
      const res = await fetch(`/api/items/${itemId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Error al votar");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(null);
    }
  }

  const isApproved = myVote === "APPROVE";
  const isRejected = myVote === "REJECT";
  const busy = loading !== null;

  return (
    <div className="flex gap-2">
      <button
        onClick={() => vote("APPROVE")}
        disabled={busy}
        aria-label="Aprobar"
        className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold transition-all disabled:opacity-40 ${
          isApproved
            ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
            : "border-[#3f3f46] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
        }`}
      >
        {loading === "APPROVE" ? "..." : `👍 Me gusta${approvals > 0 ? ` · ${approvals}` : ""}`}
      </button>

      <button
        onClick={() => vote("REJECT")}
        disabled={busy}
        aria-label="Rechazar"
        className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold transition-all disabled:opacity-40 ${
          isRejected
            ? "border-red-500/40 bg-red-500/20 text-red-400"
            : "border-[#3f3f46] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
        }`}
      >
        {loading === "REJECT" ? "..." : `👎 No me gusta${rejections > 0 ? ` · ${rejections}` : ""}`}
      </button>
    </div>
  );
}
