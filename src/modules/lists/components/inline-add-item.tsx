"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  sectionId?: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onAdd: (item: { text: string; sectionId?: string }) => Promise<void>;
};

export function InlineAddItem({ sectionId, isOpen, onOpen, onClose, onAdd }: Props) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setText("");
    }
  }, [isOpen]);

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!text.trim() || submittingRef.current) return;
      submittingRef.current = true;
      await onAdd({ text: text.trim(), sectionId });
      setText("");
      submittingRef.current = false;
      // Input was never disabled, so focus is already here — nothing to do
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={onOpen}
        className="flex items-center gap-1.5 w-full px-2 py-1.5 text-sm text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors text-left"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="6.5" y1="1" x2="6.5" y2="12" /><line x1="1" y1="6.5" x2="12" y2="6.5" />
        </svg>
        <span>Añadir ítem</span>
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onClose()}
      placeholder="Nuevo ítem — Enter para añadir, Esc para cerrar"
      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-500"
    />
  );
}
