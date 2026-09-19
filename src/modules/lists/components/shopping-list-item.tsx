"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ItemContextMenu } from "./item-context-menu";
import type { ListItem } from "../types";

type Props = {
  item: ListItem;
  canEdit: boolean;
  myParticipantId: string;
  showCheckedBy?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onToggle: (itemId: string, checked: boolean) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onEdit: (itemId: string, text: string, notes: string | null) => Promise<void>;
  onMoveUp?: () => Promise<void>;
  onMoveDown?: () => Promise<void>;
};

export function ShoppingListItem({
  item,
  canEdit,
  myParticipantId,
  showCheckedBy = true,
  isFirst = false,
  isLast = false,
  onToggle,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
}: Props) {
  const [showNotes, setShowNotes] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(item.notes ?? "");
  const [editingText, setEditingText] = useState(false);
  const [textValue, setTextValue] = useState(item.text);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Long-press state for mobile
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function showMenu(x: number, y: number) {
    setMenuPos({ x, y });
  }

  function handleContextMenu(e: React.MouseEvent) {
    if (!canEdit || editingText) return;
    e.preventDefault();
    showMenu(e.clientX, e.clientY);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (!canEdit || editingText) return;
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      showMenu(touch.clientX, touch.clientY - 10);
    }, 450);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStart.current || !longPressTimer.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStart.current.x);
    const dy = Math.abs(touch.clientY - touchStart.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleTouchEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStart.current = null;
  }

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

  async function handleTextBlur() {
    setEditingText(false);
    if (textValue.trim() && textValue.trim() !== item.text) {
      await onEdit(item.id, textValue.trim(), item.notes);
    } else {
      setTextValue(item.text);
    }
  }

  function handleTextClick() {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    if (canEdit && !item.checked) setEditingText(true);
  }

  const hasNotes = !!item.notes;

  return (
    <div
      className={`group transition-opacity duration-150 ${deleting ? "opacity-40" : ""}`}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${item.checked ? "opacity-55" : ""}`}>

        {/* Checkbox */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`shrink-0 h-4.5 w-4.5 rounded-md border-2 transition-all flex items-center justify-center ${
            item.checked
              ? "border-emerald-400 bg-emerald-400 dark:border-emerald-500 dark:bg-emerald-500"
              : "border-zinc-300 bg-white hover:border-zinc-500 dark:border-zinc-600 dark:bg-transparent dark:hover:border-zinc-400"
          } ${toggling ? "opacity-50" : ""}`}
          aria-label={item.checked ? "Desmarcar" : "Marcar como completado"}
        >
          {item.checked && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 3.5 6.5 9 1" />
            </svg>
          )}
        </button>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {editingText && canEdit ? (
            <input
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onBlur={handleTextBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") { setTextValue(item.text); setEditingText(false); }
              }}
              onContextMenu={(e) => e.stopPropagation()}
              autoFocus
              className="w-full rounded border-b border-zinc-300 bg-transparent py-0.5 text-sm text-zinc-800 focus:outline-none dark:border-zinc-600 dark:text-zinc-200"
            />
          ) : (
            <button
              onClick={handleTextClick}
              className={`block w-full text-left text-sm leading-snug wrap-break-word transition-colors select-none ${
                item.checked
                  ? "line-through text-zinc-400 dark:text-zinc-500 cursor-default"
                  : `text-zinc-800 dark:text-zinc-200 ${canEdit ? "cursor-text" : ""}`
              }`}
            >
              {item.text}
            </button>
          )}
          {showCheckedBy && item.checked && item.checkedByParticipant && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              ✓ {item.checkedByParticipant.id === myParticipantId ? "Tú" : item.checkedByParticipant.name}
            </span>
          )}
        </div>

        {/* Notes indicator */}
        {hasNotes && (
          <button
            onClick={() => { setShowNotes(!showNotes); if (!showNotes) setEditingNotes(false); }}
            className="shrink-0 rounded p-1 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            title="Ver nota"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 2h9v7l-2.5 2.5H2z" /><line x1="4" y1="5" x2="9" y2="5" /><line x1="4" y1="7.5" x2="7" y2="7.5" />
            </svg>
          </button>
        )}

        {/* Context menu hint — desktop only, appears on hover */}
        {canEdit && !editingText && (
          <button
            onClick={(e) => { e.stopPropagation(); showMenu(e.clientX, e.clientY); }}
            className="shrink-0 rounded p-1 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100 md:flex hidden"
            aria-label="Más opciones"
            title="Más opciones (o click derecho)"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
              <circle cx="6.5" cy="2.5" r="1.2" />
              <circle cx="6.5" cy="6.5" r="1.2" />
              <circle cx="6.5" cy="10.5" r="1.2" />
            </svg>
          </button>
        )}
      </div>

      {/* Notes area */}
      {showNotes && (
        <div className="px-8 pb-1">
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

      {/* Context menu */}
      {menuPos && (
        <ItemContextMenu
          x={menuPos.x}
          y={menuPos.y}
          isFirst={isFirst}
          isLast={isLast}
          hasNotes={hasNotes}
          onClose={() => setMenuPos(null)}
          onMoveUp={() => onMoveUp?.()}
          onMoveDown={() => onMoveDown?.()}
          onEditText={() => setEditingText(true)}
          onToggleNotes={() => { setShowNotes(true); setEditingNotes(true); }}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
