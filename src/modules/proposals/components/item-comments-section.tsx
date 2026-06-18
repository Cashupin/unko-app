"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export type CommentEntry = {
  id: string;
  text: string;
  createdAt: string;
  userId: string;
  userName: string | null;
  userImage: string | null;
};

function initials(name: string | null): string {
  return name ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ItemCommentsSection({
  itemId,
  comments,
  currentUserId,
  isAdmin,
}: {
  itemId: string;
  comments: CommentEntry[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/items/${itemId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Error al comentar");
        return;
      }
      setText("");
      router.refresh();
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    setDeletingId(commentId);
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Error al eliminar comentario");
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      {comments.length === 0 ? (
        <p className="text-[13px] text-zinc-500 italic mb-3">Sin comentarios aún.</p>
      ) : (
        <div className="flex flex-col gap-1.5 mb-3">
          {comments.map((c) => {
            const canDelete = c.userId === currentUserId || isAdmin;
            return (
              <div key={c.id} className="flex items-start gap-2.5 rounded-xl bg-[#27272a] px-3 py-2">
                {c.userImage ? (
                  <img
                    src={c.userImage}
                    alt={c.userName ?? ""}
                    className="rounded-full object-cover shrink-0"
                    style={{ width: 28, height: 28 }}
                  />
                ) : (
                  <div
                    className="rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0 text-[11px]"
                    style={{ width: 28, height: 28 }}
                  >
                    {initials(c.userName)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-zinc-200">{c.userName ?? "Usuario"}</span>
                    <span className="text-[11px] text-zinc-500">{fmtDate(c.createdAt)}</span>
                  </div>
                  <p className="text-[13px] text-zinc-300 leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
                    {c.text}
                  </p>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="shrink-0 text-zinc-600 hover:text-red-400 transition-colors text-xs disabled:opacity-40"
                    aria-label="Eliminar comentario"
                  >
                    {deletingId === c.id ? "…" : "✕"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un comentario..."
          maxLength={2000}
          className="flex-1 rounded-xl border border-[#3f3f46] bg-[#18191c] px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white transition-colors disabled:opacity-50"
        >
          {submitting ? "..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
