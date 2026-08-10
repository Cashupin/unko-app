"use client";

import { useEffect, useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { ShoppingListSection } from "./shopping-list-section";
import { ShoppingListItem } from "./shopping-list-item";
import { InlineAddItem } from "./inline-add-item";
import type { ShoppingList, ListItem } from "../types";

type Props = {
  list: ShoppingList;
  tripId: string;
  canEdit: boolean;
  myParticipantId: string;
  onAddItem: (listId: string, data: { text: string; sectionId?: string }) => Promise<void>;
  onToggleItem: (listId: string, itemId: string, checked: boolean) => Promise<void>;
  onDeleteItem: (listId: string, itemId: string) => Promise<void>;
  onEditItem: (listId: string, itemId: string, text: string, notes: string | null) => Promise<void>;
  onAddSection: (listId: string, title: string) => Promise<void>;
  onDeleteSection: (listId: string, sectionId: string) => Promise<void>;
  onRenameSection: (listId: string, sectionId: string, title: string) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
  onEditList: (listId: string, data: { title?: string; emoji?: string | null }) => Promise<void>;
};

function useCollapsed(listId: string) {
  const key = `list-collapsed-${listId}`;
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

export function ShoppingListCard({
  list,
  tripId,
  canEdit,
  myParticipantId,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onEditItem,
  onAddSection,
  onDeleteSection,
  onRenameSection,
  onDeleteList,
  onEditList,
}: Props) {
  const [collapsed, toggleCollapsed] = useCollapsed(list.id);
  const [addingSection, setAddingSection] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(list.title);
  const [mounted, setMounted] = useState(false);
  // "direct" = zona sin sección; sectionId = esa sección; null = ninguno
  const [activeAddFor, setActiveAddFor] = useState<string | null>(null);

  function openAddFor(id: string) {
    setActiveAddFor(id);
  }

  function closeAddFor(id: string) {
    setActiveAddFor((current) => (current === id ? null : current));
  }

  useEffect(() => setMounted(true), []);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  // Progress calculation
  const allItems: ListItem[] = [
    ...list.items,
    ...list.sections.flatMap((s) => s.items),
  ];
  const total = allItems.length;
  const done = allItems.filter((i) => i.checked).length;

  async function handleAddSection(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionTitle.trim()) return;
    await onAddSection(list.id, sectionTitle.trim());
    setSectionTitle("");
    setAddingSection(false);
  }

  async function handleTitleBlur() {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue.trim() !== list.title) {
      await onEditList(list.id, { title: titleValue.trim() });
    } else {
      setTitleValue(list.title);
    }
  }

  // Item IDs in the direct (no-section) zone
  const directItemIds = list.items.map((i) => i.id);
  const sectionIds = list.sections.map((s) => s.id);

  const visibilityIcon = list.visibility === "PRIVATE" ? "🔒" : "🌍";
  const showCheckedBy = list.visibility !== "PRIVATE";

  return (
    <div ref={setNodeRef} style={style} className="group/list rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900">
      {/* List header */}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Drag handle */}
        {canEdit && (
          <button
            {...attributes}
            {...listeners}
            className="shrink-0 cursor-grab touch-none text-zinc-300 opacity-0 group-hover/list:opacity-100 dark:text-zinc-600"
            aria-label="Arrastrar lista"
          >
            <svg width="16" height="16" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="4" cy="3" r="1.2" /><circle cx="10" cy="3" r="1.2" />
              <circle cx="4" cy="7" r="1.2" /><circle cx="10" cy="7" r="1.2" />
              <circle cx="4" cy="11" r="1.2" /><circle cx="10" cy="11" r="1.2" />
            </svg>
          </button>
        )}

        {/* Emoji */}
        {list.emoji && (
          <span className="shrink-0 text-lg leading-none">{list.emoji}</span>
        )}

        {/* Title */}
        <div className="flex-1 min-w-0">
          {editingTitle && canEdit ? (
            <input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setTitleValue(list.title); setEditingTitle(false); } }}
              autoFocus
              className="w-full rounded border-b border-zinc-300 bg-transparent py-0.5 text-sm font-semibold text-zinc-900 focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
            />
          ) : (
            <button
              onClick={() => canEdit && setEditingTitle(true)}
              className={`text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100 ${canEdit ? "hover:text-zinc-600 dark:hover:text-zinc-300" : ""} truncate max-w-full block`}
            >
              {list.title}
            </button>
          )}
        </div>

        {/* Right side: visibility + progress + collapse + delete */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-zinc-400 dark:text-zinc-500" title={list.visibility === "PRIVATE" ? "Solo tú" : "Todos en el viaje"}>
            {visibilityIcon}
          </span>

          {total > 0 && (
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {done}/{total}
            </span>
          )}

          {canEdit && (
            <button
              onClick={() => toast(`¿Eliminar la lista "${list.title}"?`, {
                action: { label: "Eliminar", onClick: () => onDeleteList(list.id) },
                cancel: { label: "Cancelar", onClick: () => {} },
              })}
              className="text-zinc-300 md:opacity-0 md:group-hover/list:opacity-100 hover:text-red-400 transition-colors dark:text-zinc-600 dark:hover:text-red-400"
              aria-label="Eliminar lista"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
              </svg>
            </button>
          )}

          <button
            onClick={toggleCollapsed}
            className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
            aria-label={collapsed ? "Expandir" : "Colapsar"}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${mounted && collapsed ? "" : "rotate-180"}`}
            >
              <polyline points="2 4 6 8 10 4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mx-4 mb-1 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-1 rounded-full bg-zinc-400 transition-all dark:bg-zinc-500"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
      )}

      {/* Body */}
      {(!mounted || !collapsed) && (
        <div className="px-4 pb-4 pt-2">
          {/* Sections */}
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            {list.sections.map((section) => (
              <ShoppingListSection
                key={section.id}
                section={section}
                canEdit={canEdit}
                myParticipantId={myParticipantId}
                showCheckedBy={showCheckedBy}
                addItemOpen={activeAddFor === section.id}
                onOpenAddItem={() => openAddFor(section.id)}
                onCloseAddItem={() => closeAddFor(section.id)}
                onAddItem={(data) => onAddItem(list.id, data)}
                onToggleItem={(itemId, checked) => onToggleItem(list.id, itemId, checked)}
                onDeleteItem={(itemId) => onDeleteItem(list.id, itemId)}
                onEditItem={(itemId, text, notes) => onEditItem(list.id, itemId, text, notes)}
                onDeleteSection={(sectionId) => onDeleteSection(list.id, sectionId)}
                onRenameSection={(sectionId, title) => onRenameSection(list.id, sectionId, title)}
              />
            ))}
          </SortableContext>

          {/* Direct items (no section) */}
          {list.sections.length > 0 && list.items.length > 0 && (
            <div className="mt-4 border-t border-zinc-100 pt-1 dark:border-zinc-800" />
          )}
          <SortableContext items={directItemIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-0.5">
              {list.items.map((item) => (
                <ShoppingListItem
                  key={item.id}
                  item={item}
                  canEdit={canEdit}
                  myParticipantId={myParticipantId}
                  showCheckedBy={showCheckedBy}
                  onToggle={(itemId, checked) => onToggleItem(list.id, itemId, checked)}
                  onDelete={(itemId) => onDeleteItem(list.id, itemId)}
                  onEdit={(itemId, text, notes) => onEditItem(list.id, itemId, text, notes)}
                />
              ))}
            </div>
          </SortableContext>

          {/* Quick add direct item */}
          {canEdit && (
            <div className="mt-2">
              <InlineAddItem
                isOpen={activeAddFor === "direct"}
                onOpen={() => openAddFor("direct")}
                onClose={() => closeAddFor("direct")}
                onAdd={(data) => onAddItem(list.id, data)}
              />
            </div>
          )}

          {/* Add section */}
          {canEdit && (
            <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              {addingSection ? (
                <form onSubmit={handleAddSection} className="flex items-center gap-2">
                  <input
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") { setAddingSection(false); setSectionTitle(""); } }}
                    onBlur={() => { if (!sectionTitle.trim()) setAddingSection(false); }}
                    autoFocus
                    placeholder="Nombre de la sección..."
                    className="flex-1 min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-600"
                  />
                  <button
                    type="submit"
                    disabled={!sectionTitle.trim()}
                    className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    Crear
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddingSection(false); setSectionTitle(""); }}
                    className="shrink-0 text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                  >
                    ✕
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setAddingSection(true)}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                >
                  + Nueva sección
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
