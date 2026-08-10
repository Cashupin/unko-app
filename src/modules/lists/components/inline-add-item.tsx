"use client";

import { useRef, useState } from "react";

type Props = {
  listId: string;
  tripId: string;
  sectionId?: string;
  onAdd: (item: { text: string; sectionId?: string }) => Promise<void>;
};

export function InlineAddItem({ sectionId, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    await onAdd({ text: text.trim(), sectionId });
    setText("");
    setLoading(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      setText("");
    }
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors text-left"
      >
        <span className="text-base leading-none">+</span>
        <span>Añadir ítem</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-1">
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (!text.trim()) setOpen(false); }}
        placeholder="Nuevo ítem..."
        disabled={loading}
        className="flex-1 min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-500"
      />
      <button
        type="submit"
        disabled={loading || !text.trim()}
        className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {loading ? "..." : "Añadir"}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setText(""); }}
        className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
      >
        ✕
      </button>
    </form>
  );
}
