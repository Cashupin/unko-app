"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ListItem } from "../types";

type Props = {
  item: ListItem;
  canEdit: boolean;
  myParticipantId: string;
  onToggle: (itemId: string, checked: boolean) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onEdit: (itemId: string, text: string, notes: string | null) => Promise<void>;
};

export function ShoppingListItem({ item, canEdit, onToggle, onDelete, onEdit }: Props) {
  const [showNotes, setShowNotes] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(item.notes ?? "");
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  async function handleToggle() {
    setToggling(true);
    await onToggle(item.id, !item.checked);
    setToggling(false);
  }

  async function handleDelete() {
    setDeleting(true);
    await onDelete(item.id);
  }

  async function handleNotesBlur() {
    setEditingNotes(false);
    if (notesValue !== (item.notes ?? "")) {
      await onEdit(item.id, item.text, notesValue.trim() || null);
    }
  }

  const hasNotes = !!item.notes;

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div className="flex items-start gap-2 py-1">
        {/* Drag handle */}
        {canEdit && (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab touch-none text-zinc-300 opacity-0 group-hover:opacity-100 dark:text-zinc-600"
            aria-label="Arrastrar"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="4" cy="3" r="1.2" /><circle cx="10" cy="3" r="1.2" />
              <circle cx="4" cy="7" r="1.2" /><circle cx="10" cy="7" r="1.2" />
              <circle cx="4" cy="11" r="1.2" /><circle cx="10" cy="11" r="1.2" />
            </svg>
          </button>
        )}

        {/* Checkbox */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`mt-0.5 shrink-0 h-4 w-4 rounded border-2 transition-all flex items-center justify-center ${
            item.checked
              ? "border-zinc-400 bg-zinc-400 dark:border-zinc-500 dark:bg-zinc-500"
              : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:border-zinc-500"
          } ${toggling ? "opacity-50" : ""}`}
          aria-label={item.checked ? "Marcar como pendiente" : "Marcar como completado"}
        >
          {item.checked && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 3.5 3.5 6 8 1" />
            </svg>
          )}
        </button>

        {/* Text + notes */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-sm leading-snug break-words ${
                item.checked
                  ? "line-through text-zinc-400 dark:text-zinc-500"
                  : "text-zinc-800 dark:text-zinc-200"
              }`}
            >
              {item.text}
            </span>
            {/* Notes indicator / toggle */}
            <button
              onClick={() => { setShowNotes(!showNotes); if (!showNotes) setEditingNotes(false); }}
              className={`shrink-0 rounded px-1 py-0.5 text-xs transition-colors ${
                hasNotes
                  ? "text-zinc-400 dark:text-zinc-500"
                  : "text-zinc-300 opacity-0 group-hover:opacity-100 dark:text-zinc-600"
              } hover:text-zinc-600 dark:hover:text-zinc-300`}
              title={hasNotes ? "Ver nota" : "Añadir nota"}
            >
              {hasNotes ? "📝" : "···"}
            </button>
          </div>

          {/* Checked-by label */}
          {item.checked && item.checkedByParticipant && (
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
              ✓ {item.checkedByParticipant.name}
            </p>
          )}

          {/* Notes area */}
          {showNotes && (
            <div className="mt-1.5">
              {editingNotes && canEdit ? (
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  onBlur={handleNotesBlur}
                  autoFocus
                  rows={2}
                  placeholder="Añade una nota, link o referencia..."
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-600 resize-none"
                />
              ) : (
                <div
                  onClick={() => canEdit && setEditingNotes(true)}
                  className={`rounded-lg bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400 ${canEdit ? "cursor-text hover:bg-zinc-100 dark:hover:bg-zinc-800" : ""}`}
                >
                  {item.notes ? (
                    item.notes.startsWith("http") ? (
                      <a
                        href={item.notes}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-500 underline break-all hover:text-blue-600 dark:text-blue-400"
                      >
                        {item.notes}
                      </a>
                    ) : (
                      <span className="whitespace-pre-wrap break-words">{item.notes}</span>
                    )
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-500 italic">Sin nota — click para añadir</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete button */}
        {canEdit && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="mt-0.5 shrink-0 text-zinc-300 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-colors dark:text-zinc-600 dark:hover:text-red-400"
            aria-label="Eliminar ítem"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
