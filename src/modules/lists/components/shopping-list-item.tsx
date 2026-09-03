"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ListItem } from "../types";

type Props = {
  item: ListItem;
  canEdit: boolean;
  myParticipantId: string;
  showCheckedBy?: boolean;
  onToggle: (itemId: string, checked: boolean) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onEdit: (itemId: string, text: string, notes: string | null) => Promise<void>;
};

export function ShoppingListItem({ item, canEdit, myParticipantId, showCheckedBy = true, onToggle, onDelete, onEdit }: Props) {
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
    opacity: isDragging ? 0.35 : 1,
  };

  async function handleToggle() {
    setToggling(true);
    await onToggle(item.id, !item.checked);
    setToggling(false);
  }

  function handleDelete() {
    toast(`¿Eliminar "${item.text}"?`, {
      action: { label: "Eliminar", onClick: async () => { setDeleting(true); await onDelete(item.id); } },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
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
      {/* Row — full hover highlight */}
      <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${deleting ? "opacity-40" : ""}`}>

        {/* Drag handle — desktop only, shows on row hover */}
        {canEdit && (
          <button
            {...attributes}
            {...listeners}
            className="hidden md:flex shrink-0 cursor-grab touch-none text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
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
          className={`shrink-0 h-4.5 w-4.5 rounded-md border-2 transition-all flex items-center justify-center ${
            item.checked
              ? "border-zinc-400 bg-zinc-400 dark:border-zinc-500 dark:bg-zinc-500"
              : "border-zinc-300 bg-white hover:border-zinc-500 dark:border-zinc-600 dark:bg-transparent dark:hover:border-zinc-400"
          } ${toggling ? "opacity-50" : ""}`}
          aria-label={item.checked ? "Desmarcar" : "Marcar como completado"}
        >
          {item.checked && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 3.5 6.5 9 1" />
            </svg>
          )}
        </button>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <span
            className={`block text-sm leading-snug wrap-break-word ${
              item.checked
                ? "line-through text-zinc-400 dark:text-zinc-500"
                : "text-zinc-800 dark:text-zinc-200"
            }`}
          >
            {item.text}
          </span>
          {showCheckedBy && item.checked && item.checkedByParticipant && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              ✓ {item.checkedByParticipant.id === myParticipantId ? "Tú" : item.checkedByParticipant.name}
            </span>
          )}
        </div>

        {/* Notes toggle */}
        <button
          onClick={() => { setShowNotes(!showNotes); if (!showNotes) setEditingNotes(false); }}
          className={`shrink-0 rounded p-1 transition-all ${
            hasNotes
              ? "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
              : "text-zinc-300 dark:text-zinc-700 opacity-0 group-hover:opacity-100 hover:text-zinc-500 dark:hover:text-zinc-500"
          }`}
          title={hasNotes ? "Ver nota" : "Añadir nota"}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 2h9v7l-2.5 2.5H2z" /><line x1="4" y1="5" x2="9" y2="5" /><line x1="4" y1="7.5" x2="7" y2="7.5" />
          </svg>
        </button>

        {/* Delete — always visible (subtle) on mobile, hover-only on desktop */}
        {canEdit && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="shrink-0 rounded p-1 text-zinc-300 dark:text-zinc-600 hover:text-red-400 dark:hover:text-red-400 transition-colors md:opacity-0 md:group-hover:opacity-100"
            aria-label="Eliminar ítem"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <line x1="1.5" y1="1.5" x2="11.5" y2="11.5" /><line x1="11.5" y1="1.5" x2="1.5" y2="11.5" />
            </svg>
          </button>
        )}
      </div>

      {/* Notes area — below the row */}
      {showNotes && (
        <div className="px-9 pb-1">
          {editingNotes && canEdit ? (
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              onBlur={handleNotesBlur}
              autoFocus
              rows={2}
              placeholder="Añade una nota, link o referencia..."
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-600 resize-none"
            />
          ) : (
            <div
              onClick={() => canEdit && setEditingNotes(true)}
              className={`rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400 ${canEdit ? "cursor-text hover:bg-zinc-100 dark:hover:bg-zinc-800" : ""}`}
            >
              {item.notes ? (
                /^https?:\/\//.test(item.notes) ? (
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
                  <span className="whitespace-pre-wrap wrap-break-word">{item.notes}</span>
                )
              ) : (
                <span className="text-zinc-400 dark:text-zinc-500 italic">Sin nota — click para añadir</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
