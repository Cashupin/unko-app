"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShoppingListItem } from "./shopping-list-item";
import { InlineAddItem } from "./inline-add-item";
import type { ListSection, ListItem } from "../types";

function useCollapsedSection(sectionId: string) {
  const key = `section-collapsed-${sectionId}`;
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(key) === "true";
  });
  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(key, next ? "true" : "false");
      return next;
    });
  }
  return [collapsed, toggle] as const;
}

type Props = {
  section: ListSection;
  canEdit: boolean;
  myParticipantId: string;
  showCheckedBy?: boolean;
  isFirst: boolean;
  isLast: boolean;
  addItemOpen: boolean;
  onOpenAddItem: () => void;
  onCloseAddItem: () => void;
  onAddItem: (data: { text: string; sectionId?: string }) => Promise<void>;
  onToggleItem: (itemId: string, checked: boolean) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onEditItem: (itemId: string, text: string, notes: string | null) => Promise<void>;
  onDeleteSection: (sectionId: string) => Promise<void>;
  onRenameSection: (sectionId: string, title: string) => Promise<void>;
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
  onMoveItemUp: (itemId: string) => Promise<void>;
  onMoveItemDown: (itemId: string) => Promise<void>;
};

export function ShoppingListSection({
  section,
  canEdit,
  myParticipantId,
  showCheckedBy = true,
  isFirst,
  isLast,
  addItemOpen,
  onOpenAddItem,
  onCloseAddItem,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onEditItem,
  onDeleteSection,
  onRenameSection,
  onMoveUp,
  onMoveDown,
  onMoveItemUp,
  onMoveItemDown,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(section.title);
  const [collapsed, toggleCollapsed] = useCollapsedSection(section.id);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  async function handleTitleBlur() {
    setEditing(false);
    if (titleValue.trim() && titleValue.trim() !== section.title) {
      await onRenameSection(section.id, titleValue.trim());
    } else {
      setTitleValue(section.title);
    }
  }

  const total = section.items.length;
  const done = section.items.filter((i: ListItem) => i.checked).length;

  return (
    <div className="group/section mt-4">
      {/* Section header — entire row toggles collapse */}
      <div
        role="button"
        onClick={toggleCollapsed}
        className="flex cursor-pointer items-center gap-1.5 mb-1.5 px-2 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border-l-2 border-zinc-200 dark:border-zinc-700 select-none"
      >
        {/* ↑↓ section reorder — stop propagation so they don't collapse */}
        {canEdit && (
          <div
            className="flex flex-col shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onMoveUp}
              className={`h-4 w-4 flex items-center justify-center transition-colors ${isFirst ? "opacity-0 pointer-events-none" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
              tabIndex={isFirst ? -1 : 0}
              aria-label="Subir sección"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2 8 6 4 10 8" />
              </svg>
            </button>
            <button
              onClick={onMoveDown}
              className={`h-4 w-4 flex items-center justify-center transition-colors ${isLast ? "opacity-0 pointer-events-none" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
              tabIndex={isLast ? -1 : 0}
              aria-label="Bajar sección"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2 4 6 8 10 4" />
              </svg>
            </button>
          </div>
        )}

        {/* Title — click stops propagation so it starts editing instead of collapsing */}
        {editing && canEdit ? (
          <input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") { setTitleValue(section.title); setEditing(false); }
            }}
            autoFocus
            className="flex-1 min-w-0 rounded border border-zinc-200 bg-transparent px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:focus:ring-zinc-600"
          />
        ) : (
          <span
            onClick={(e) => {
              if (!canEdit) return;
              e.stopPropagation();
              setEditing(true);
            }}
            className={`flex-1 min-w-0 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate ${canEdit ? "cursor-text" : "cursor-default"}`}
          >
            {section.title}
          </span>
        )}

        {/* Count badge */}
        {total > 0 && (
          <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
            {done}/{total}
          </span>
        )}

        {/* Chevron — visual indicator only, clicks bubble to parent div */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-zinc-400 dark:text-zinc-500 transition-transform duration-150 ${mounted && collapsed ? "-rotate-90" : ""}`}
        >
          <polyline points="2 4 6 8 10 4" />
        </svg>

        {/* Delete — stop propagation */}
        {canEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast(`¿Eliminar la sección "${section.title}"?`, {
                action: { label: "Eliminar", onClick: () => onDeleteSection(section.id) },
                cancel: { label: "Cancelar", onClick: () => {} },
              });
            }}
            className="shrink-0 text-zinc-300 opacity-0 group-hover/section:opacity-100 hover:text-red-400 transition-colors dark:text-zinc-600 dark:hover:text-red-400"
            aria-label="Eliminar sección"
          >
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>
        )}
      </div>

      {/* Items */}
      {(!mounted || !collapsed) && (
        <>
          <div className="flex flex-col gap-0.5 pl-2">
            {section.items.map((item: ListItem, idx: number) => (
              <ShoppingListItem
                key={item.id}
                item={item}
                canEdit={canEdit}
                myParticipantId={myParticipantId}
                showCheckedBy={showCheckedBy}
                isFirst={idx === 0}
                isLast={idx === section.items.length - 1}
                onToggle={onToggleItem}
                onDelete={onDeleteItem}
                onEdit={onEditItem}
                onMoveUp={() => onMoveItemUp(item.id)}
                onMoveDown={() => onMoveItemDown(item.id)}
              />
            ))}
          </div>

          {canEdit && (
            <div className="mt-1 pl-2">
              <InlineAddItem
                sectionId={section.id}
                isOpen={addItemOpen}
                onOpen={onOpenAddItem}
                onClose={onCloseAddItem}
                onAdd={onAddItem}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
