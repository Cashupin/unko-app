"use client";

import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { ShoppingListSection } from "./shopping-list-section";
import { ShoppingListItem } from "./shopping-list-item";
import { InlineAddItem } from "./inline-add-item";
import { ListContextMenu } from "./list-context-menu";
import type { ShoppingList, ListItem } from "../types";

type Props = {
  list: ShoppingList;
  tripId: string;
  canEdit: boolean;
  myParticipantId: string;
  isFirst: boolean;
  isLast: boolean;
  onAddItem: (listId: string, data: { text: string; sectionId?: string }) => Promise<void>;
  onToggleItem: (listId: string, itemId: string, checked: boolean) => Promise<void>;
  onDeleteItem: (listId: string, itemId: string) => Promise<void>;
  onEditItem: (listId: string, itemId: string, text: string, notes: string | null) => Promise<void>;
  onAddSection: (listId: string, title: string) => Promise<void>;
  onDeleteSection: (listId: string, sectionId: string) => Promise<void>;
  onRenameSection: (listId: string, sectionId: string, title: string) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
  onEditList: (listId: string, data: { title?: string; emoji?: string | null }) => Promise<void>;
  onMoveItem: (listId: string, itemId: string, direction: "up" | "down") => Promise<void>;
  onMoveSection: (listId: string, sectionId: string, direction: "up" | "down") => Promise<void>;
  onMoveListUp: () => Promise<void>;
  onMoveListDown: () => Promise<void>;
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
  tripId: _tripId,
  canEdit,
  myParticipantId,
  isFirst,
  isLast,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onEditItem,
  onAddSection,
  onDeleteSection,
  onRenameSection,
  onDeleteList,
  onEditList,
  onMoveItem,
  onMoveSection,
  onMoveListUp,
  onMoveListDown,
}: Props) {
  const [collapsed, toggleCollapsed] = useCollapsed(list.id);
  const [addingSection, setAddingSection] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(list.title);
  const [mounted, setMounted] = useState(false);
  const [activeAddFor, setActiveAddFor] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Long-press for context menu on mobile
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function openAddFor(id: string) { setActiveAddFor(id); }
  function closeAddFor(id: string) { setActiveAddFor((current) => (current === id ? null : current)); }

  useEffect(() => setMounted(true), []);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const allItems: ListItem[] = [
    ...list.items,
    ...list.sections.flatMap((s) => s.items),
  ];
  const total = allItems.length;
  const done = allItems.filter((i) => i.checked).length;
  const isComplete = total > 0 && done === total;
  const progressPct = total > 0 ? (done / total) * 100 : 0;

  function showMenu(x: number, y: number) {
    setMenuPos({ x, y });
  }

  function handleHeaderContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    showMenu(e.clientX, e.clientY);
  }

  function handleTouchStart(e: React.TouchEvent) {
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

  function handleHeaderClick() {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    if (!editingTitle) toggleCollapsed();
  }

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

  function handleDeleteList() {
    toast(`¿Eliminar la lista "${list.title}"?`, {
      action: { label: "Eliminar", onClick: () => onDeleteList(list.id) },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  }

  const visibilityIcon = list.visibility === "PRIVATE" ? "🔒" : "🌍";
  const showCheckedBy = list.visibility !== "PRIVATE";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/list rounded-2xl border bg-white shadow-md dark:shadow-zinc-950/60 dark:bg-zinc-900 transition-colors ${
        isComplete
          ? "border-emerald-200 dark:border-emerald-800/60"
          : "border-zinc-200 dark:border-zinc-700/80"
      }`}
    >
      {/* List header — clickeable para colapsar, right-click / long-press para menú */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleHeaderClick}
        onContextMenu={handleHeaderContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleCollapsed(); }}
        className="flex cursor-pointer select-none items-center gap-2 px-4 py-3"
      >
        {/* Drag handle — stop propagation so it doesn't collapse */}
        {canEdit && (
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
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
        <div className="flex-1 min-w-0" onClick={(e) => editingTitle && e.stopPropagation()}>
          {editingTitle && canEdit ? (
            <input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") { setTitleValue(list.title); setEditingTitle(false); }
              }}
              autoFocus
              className="w-full rounded border-b border-zinc-300 bg-transparent py-0.5 text-sm font-semibold text-zinc-900 focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
            />
          ) : (
            <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {list.title}
            </span>
          )}
        </div>

        {/* Right side */}
        <div
          className="flex items-center gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.stopPropagation()}
        >
          <span className="text-xs text-zinc-400 dark:text-zinc-500" title={list.visibility === "PRIVATE" ? "Solo tú" : "Todos en el viaje"}>
            {visibilityIcon}
          </span>

          {isComplete ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              ¡Completa!
            </span>
          ) : total > 0 ? (
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {done}/{total}
            </span>
          ) : null}

          {/* Chevron */}
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`text-zinc-400 dark:text-zinc-500 transition-transform ${mounted && collapsed ? "" : "rotate-180"}`}
          >
            <polyline points="2 4 6 8 10 4" />
          </svg>

          {/* ⋯ context menu button — always visible */}
          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                showMenu(e.clientX, e.clientY);
              }}
              onTouchStart={(e) => e.stopPropagation()}
              className="shrink-0 rounded p-0.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              aria-label="Más opciones de lista"
            >
              <svg width="14" height="14" viewBox="0 0 13 13" fill="currentColor">
                <circle cx="6.5" cy="2.5" r="1.2" />
                <circle cx="6.5" cy="6.5" r="1.2" />
                <circle cx="6.5" cy="10.5" r="1.2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mx-4 mb-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${isComplete ? "bg-emerald-400 dark:bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-500"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Body */}
      {(!mounted || !collapsed) && (
        <div className="px-4 pb-4 pt-2">
          {/* Sections */}
          {list.sections.map((section, idx) => (
            <ShoppingListSection
              key={section.id}
              section={section}
              canEdit={canEdit}
              myParticipantId={myParticipantId}
              showCheckedBy={showCheckedBy}
              index={idx}
              isFirst={idx === 0}
              isLast={idx === list.sections.length - 1}
              addItemOpen={activeAddFor === section.id}
              onOpenAddItem={() => openAddFor(section.id)}
              onCloseAddItem={() => closeAddFor(section.id)}
              onAddItem={(data) => onAddItem(list.id, data)}
              onToggleItem={(itemId, checked) => onToggleItem(list.id, itemId, checked)}
              onDeleteItem={(itemId) => onDeleteItem(list.id, itemId)}
              onEditItem={(itemId, text, notes) => onEditItem(list.id, itemId, text, notes)}
              onDeleteSection={(sectionId) => onDeleteSection(list.id, sectionId)}
              onRenameSection={(sectionId, title) => onRenameSection(list.id, sectionId, title)}
              onMoveUp={() => onMoveSection(list.id, section.id, "up")}
              onMoveDown={() => onMoveSection(list.id, section.id, "down")}
              onMoveItemUp={(itemId) => onMoveItem(list.id, itemId, "up")}
              onMoveItemDown={(itemId) => onMoveItem(list.id, itemId, "down")}
            />
          ))}

          {/* Direct items (no section) */}
          {list.sections.length > 0 && list.items.length > 0 && (
            <div className="mt-4 border-t border-zinc-100 pt-1 dark:border-zinc-800" />
          )}
          <div className="flex flex-col gap-0.5">
            {list.items.map((item, idx) => (
              <ShoppingListItem
                key={item.id}
                item={item}
                canEdit={canEdit}
                myParticipantId={myParticipantId}
                showCheckedBy={showCheckedBy}
                isFirst={idx === 0}
                isLast={idx === list.items.length - 1}
                onToggle={(itemId, checked) => onToggleItem(list.id, itemId, checked)}
                onDelete={(itemId) => onDeleteItem(list.id, itemId)}
                onEdit={(itemId, text, notes) => onEditItem(list.id, itemId, text, notes)}
                onMoveUp={() => onMoveItem(list.id, item.id, "up")}
                onMoveDown={() => onMoveItem(list.id, item.id, "down")}
              />
            ))}
          </div>

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

      {/* Context menu */}
      {menuPos && (
        <ListContextMenu
          x={menuPos.x}
          y={menuPos.y}
          isFirst={isFirst}
          isLast={isLast}
          collapsed={collapsed}
          onClose={() => setMenuPos(null)}
          onMoveUp={onMoveListUp}
          onMoveDown={onMoveListDown}
          onRename={() => setEditingTitle(true)}
          onToggleCollapse={toggleCollapsed}
          onDelete={handleDeleteList}
        />
      )}
    </div>
  );
}
