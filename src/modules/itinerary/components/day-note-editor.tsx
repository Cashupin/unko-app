"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DayNoteEditor({
  tripId,
  date,
  initialLabel,
  canEdit,
}: {
  tripId: string;
  date: string;
  initialLabel: string;
  canEdit: boolean;
}) {
  const [label, setLabel] = useState(initialLabel);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialLabel);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  async function save(value: string) {
    const trimmed = value.trim();
    setLabel(trimmed);
    setEditing(false);
    if (trimmed === initialLabel) return;
    await fetch(`/api/trips/${tripId}/day-notes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, label: trimmed }),
    });
    startTransition(() => router.refresh());
  }

  if (!label && !canEdit) return null;

  if (!editing) {
    return (
      <div
        className={`mt-0.5 flex items-center gap-1 ${canEdit ? "group/note cursor-pointer" : ""}`}
        onClick={() => {
          if (!canEdit) return;
          setDraft(label);
          setEditing(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        {label ? (
          <span className="text-[11px] font-medium text-zinc-400 leading-snug truncate max-w-48 md:max-w-72">
            {label}
          </span>
        ) : (
          <span className="text-[11px] font-medium text-zinc-600 opacity-0 group-hover/note:opacity-100 transition-opacity">
            + Añadir nota del día
          </span>
        )}
        {canEdit && label && (
          <svg
            className="h-3 w-3 shrink-0 text-zinc-600 opacity-0 group-hover/note:opacity-100 transition-opacity"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0111 16H9v-2a2 2 0 01.586-1.414z" />
          </svg>
        )}
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={draft}
      maxLength={120}
      placeholder="Nota del día (ej. Zona Bahía Osaka)"
      className="mt-0.5 w-48 rounded-md border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-400 md:w-72"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => save(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") save(draft);
        if (e.key === "Escape") {
          setDraft(label);
          setEditing(false);
        }
      }}
    />
  );
}
