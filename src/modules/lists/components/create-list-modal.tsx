"use client";

import { useState } from "react";

const EMOJI_SUGGESTIONS = ["🛒", "🎁", "📦", "✈️", "🏖️", "🎒", "📋", "🍕", "💊", "🔧", "📸", "🎵"];

type Props = {
  onSubmit: (data: { title: string; emoji?: string; visibility: "PRIVATE" | "TRIP" }) => Promise<void>;
};

export function CreateListModal({ onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "TRIP">("TRIP");
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setOpen(false);
    setTitle("");
    setEmoji("");
    setVisibility("TRIP");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    await onSubmit({ title: title.trim(), emoji: emoji || undefined, visibility });
    setLoading(false);
    handleClose();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        <span>+</span>
        <span>Nueva lista</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={handleClose}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Nueva lista</h2>
              <button
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Emoji picker */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Emoji (opcional)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {EMOJI_SUGGESTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(emoji === e ? "" : e)}
                      className={`h-8 w-8 rounded-lg text-lg transition-all ${
                        emoji === e
                          ? "bg-zinc-900 dark:bg-zinc-100"
                          : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                  <input
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value.slice(-2))}
                    placeholder="✏️"
                    maxLength={2}
                    className="h-8 w-16 rounded-lg border border-zinc-200 bg-transparent px-2 text-center text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:placeholder:text-zinc-600 dark:focus:ring-zinc-600"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Nombre de la lista
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Compras del viaje"
                  autoFocus
                  required
                  maxLength={200}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-500"
                />
              </div>

              {/* Visibility */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Visibilidad
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibility("TRIP")}
                    className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-all ${
                      visibility === "TRIP"
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
                    }`}
                  >
                    🌍 Todos en el viaje
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility("PRIVATE")}
                    className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-all ${
                      visibility === "PRIVATE"
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
                    }`}
                  >
                    🔒 Solo yo
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="mt-1 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {loading ? "Creando..." : "Crear lista"}
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
