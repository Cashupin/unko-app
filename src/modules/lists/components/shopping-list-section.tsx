"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ShoppingListItem } from "./shopping-list-item";
import { InlineAddItem } from "./inline-add-item";
import { SectionContextMenu } from "./section-context-menu";
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
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Long-press state
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => setMounted(true), []);

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
    if (!editing) toggleCollapsed();
  }

  async function handleTitleBlur() {
    setEditing(false);
    if (titleValue.trim() && titleValue.trim() !== section.title) {
      await onRenameSection(section.id, titleValue.trim());
    } else {
      setTitleValue(section.title);
    }
  }

  function handleDeleteSection() {
    toast(`¿Eliminar la sección "${section.title}"?`, {
      action: { label: "Eliminar", onClick: () => onDeleteSection(section.id) },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  }

  const total = section.items.length;
  const done = section.items.filter((i: ListItem) => i.checked).length;

  return (
    <div className="group/section mt-4">
      {/* Section header */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleHeaderClick}
        onContextMenu={handleHeaderContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleCollapsed(); }}
        className="flex cursor-pointer items-center gap-1.5 mb-1.5 px-2 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border-l-2 border-zinc-200 dark:border-zinc-700 select-none"
      >
        {/* Title */}
        {editing && canEdit ? (
          <input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") { setTitleValue(section.title); setEditing(false); }
            }}
            autoFocus
            className="flex-1 min-w-0 rounded border border-zinc-200 bg-transparent px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:focus:ring-zinc-600"
          />
        ) : (
          <span className="flex-1 min-w-0 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
            {section.title}
          </span>
        )}

        {/* Count */}
        {total > 0 && (
          <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
            {done}/{total}
          </span>
        )}

        {/* Chevron — visual indicator */}
        <svg
          width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 text-zinc-400 dark:text-zinc-500 transition-transform duration-150 ${mounted && collapsed ? "-rotate-90" : ""}`}
        >
          <polyline points="2 4 6 8 10 4" />
        </svg>

        {/* ⋯ menu button — always visible, stop propagation */}
        {canEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              showMenu(e.clientX, e.clientY);
            }}
            onTouchStart={(e) => e.stopPropagation()}
            className="shrink-0 rounded p-0.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            aria-label="Más opciones de sección"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
              <circle cx="6.5" cy="2.5" r="1.2" />
              <circle cx="6.5" cy="6.5" r="1.2" />
              <circle cx="6.5" cy="10.5" r="1.2" />
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

      {/* Context menu */}
      {menuPos && (
        <SectionContextMenu
          x={menuPos.x}
          y={menuPos.y}
          isFirst={isFirst}
          isLast={isLast}
          collapsed={collapsed}
          onClose={() => setMenuPos(null)}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRename={() => setEditing(true)}
          onToggleCollapse={toggleCollapsed}
          onDelete={handleDeleteSection}
        />
      )}
    </div>
  );
}
