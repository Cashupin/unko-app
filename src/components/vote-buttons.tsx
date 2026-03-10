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

function ThumbUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function ThumbDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  );
}

export function VoteButtons({
  itemId,
  myVote,
  approvals,
  rejections,
}: VoteButtonsProps) {
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
    <div className="flex items-center justify-between gap-2">
      {/* Vote counts */}
      <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
        <span className={approvals > 0 ? "text-green-600 dark:text-green-500 font-medium" : ""}>{approvals} ✓</span>
        {" · "}
        <span className={rejections > 0 ? "text-red-500 dark:text-red-400 font-medium" : ""}>{rejections} ✗</span>
      </span>

      {/* Compact thumb buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => vote("APPROVE")}
          disabled={busy}
          aria-label="Aprobar"
          title="Aprobar"
          className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all disabled:opacity-40 ${
            isApproved
              ? "border-green-500 bg-green-500 text-white"
              : "border-zinc-200 text-zinc-400 hover:border-green-400 hover:text-green-600 dark:border-zinc-600 dark:text-zinc-500 dark:hover:border-green-500 dark:hover:text-green-400"
          }`}
        >
          {loading === "APPROVE" ? <span className="text-[10px]">…</span> : <ThumbUpIcon className="w-3 h-3" />}
        </button>

        <button
          onClick={() => vote("REJECT")}
          disabled={busy}
          aria-label="Rechazar"
          title="Rechazar"
          className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all disabled:opacity-40 ${
            isRejected
              ? "border-red-500 bg-red-500 text-white"
              : "border-zinc-200 text-zinc-400 hover:border-red-400 hover:text-red-600 dark:border-zinc-600 dark:text-zinc-500 dark:hover:border-red-500 dark:hover:text-red-400"
          }`}
        >
          {loading === "REJECT" ? <span className="text-[10px]">…</span> : <ThumbDownIcon className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
