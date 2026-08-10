"use client";

import { useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ShoppingListItem } from "./shopping-list-item";
import { InlineAddItem } from "./inline-add-item";
import type { ListSection, ListItem } from "../types";

type Props = {
  section: ListSection;
  canEdit: boolean;
  myParticipantId: string;
  showCheckedBy?: boolean;
  addItemOpen: boolean;
  onOpenAddItem: () => void;
  onCloseAddItem: () => void;
  onAddItem: (data: { text: string; sectionId?: string }) => Promise<void>;
  onToggleItem: (itemId: string, checked: boolean) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onEditItem: (itemId: string, text: string, notes: string | null) => Promise<void>;
  onDeleteSection: (sectionId: string) => Promise<void>;
  onRenameSection: (sectionId: string, title: string) => Promise<void>;
};

export function ShoppingListSection({
  section,
  canEdit,
  myParticipantId,
  showCheckedBy = true,
  addItemOpen,
  onOpenAddItem,
  onCloseAddItem,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onEditItem,
  onDeleteSection,
  onRenameSection,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(section.title);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  async function handleTitleBlur() {
    setEditing(false);
    if (titleValue.trim() && titleValue.trim() !== section.title) {
      await onRenameSection(section.id, titleValue.trim());
    } else {
      setTitleValue(section.title);
    }
  }

  const itemIds = section.items.map((i: ListItem) => i.id);

  return (
    <div ref={setNodeRef} style={style} className="group/section">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-2 mt-4">
        {canEdit && (
          <button
            {...attributes}
            {...listeners}
            className="shrink-0 cursor-grab touch-none text-zinc-300 opacity-0 group-hover/section:opacity-100 dark:text-zinc-600"
            aria-label="Arrastrar sección"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="4" cy="3" r="1.2" /><circle cx="10" cy="3" r="1.2" />
              <circle cx="4" cy="7" r="1.2" /><circle cx="10" cy="7" r="1.2" />
              <circle cx="4" cy="11" r="1.2" /><circle cx="10" cy="11" r="1.2" />
            </svg>
          </button>
        )}

        {editing && canEdit ? (
          <input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setTitleValue(section.title); setEditing(false); } }}
            autoFocus
            className="flex-1 min-w-0 rounded border border-zinc-200 bg-transparent px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:focus:ring-zinc-600"
          />
        ) : (
          <button
            onClick={() => canEdit && setEditing(true)}
            className={`flex-1 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 ${canEdit ? "hover:text-zinc-700 dark:hover:text-zinc-300" : ""}`}
          >
            {section.title}
          </button>
        )}

        {canEdit && (
          <button
            onClick={() => onDeleteSection(section.id)}
            className="shrink-0 text-zinc-300 opacity-0 group-hover/section:opacity-100 hover:text-red-400 transition-colors dark:text-zinc-600 dark:hover:text-red-400"
            aria-label="Eliminar sección"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>
        )}
      </div>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-0.5 pl-4">
          {section.items.map((item: ListItem) => (
            <ShoppingListItem
              key={item.id}
              item={item}
              canEdit={canEdit}
              myParticipantId={myParticipantId}
              showCheckedBy={showCheckedBy}
              onToggle={onToggleItem}
              onDelete={onDeleteItem}
              onEdit={onEditItem}
            />
          ))}
        </div>
      </SortableContext>

      {canEdit && (
        <div className="mt-1 pl-4">
          <InlineAddItem
            sectionId={section.id}
            isOpen={addItemOpen}
            onOpen={onOpenAddItem}
            onClose={onCloseAddItem}
            onAdd={onAddItem}
          />
        </div>
      )}
    </div>
  );
}
