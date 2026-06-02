"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddPersonalActivityButton({
  tripId,
  date,
}: {
  tripId: string;
  date: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/personal-activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, title: title.trim(), time: time || undefined }),
      });
      if (res.ok) {
        setTitle("");
        setTime("");
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-lg border border-violet-700/40 bg-violet-900/20 px-2.5 py-1.5 text-xs font-semibold text-violet-400 transition-colors hover:bg-violet-900/40"
        title="Añadir a mi plan"
      >
        🔒 +
      </button>
    );
  }

  return (
    <div
      className="flex items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        type="text"
        placeholder="¿Qué vas a hacer?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setOpen(false);
        }}
        className="w-40 rounded-lg border border-violet-700/40 bg-[#0f1419] px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500"
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="w-24 rounded-lg border border-violet-700/40 bg-[#0f1419] px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-violet-500"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !title.trim()}
        className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
      >
        {saving ? "…" : "Guardar"}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setTitle(""); setTime(""); }}
        className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-[#27272a] hover:text-zinc-300"
      >
        ✕
      </button>
    </div>
  );
}
