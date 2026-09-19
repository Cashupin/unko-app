"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SECTION_COLORS } from "@/modules/lists/lib/section-colors";

type Props = {
  x: number;
  y: number;
  isFirst: boolean;
  isLast: boolean;
  collapsed: boolean;
  colorIndex: number;
  onClose: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRename: () => void;
  onToggleCollapse: () => void;
  onSetColor: (index: number) => void;
  onDelete: () => void;
};

export function SectionContextMenu({
  x,
  y,
  isFirst,
  isLast,
  collapsed,
  colorIndex,
  onClose,
  onMoveUp,
  onMoveDown,
  onRename,
  onToggleCollapse,
  onSetColor,
  onDelete,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let nx = x;
    let ny = y;
    if (nx + rect.width > vw - 8) nx = vw - rect.width - 8;
    if (ny + rect.height > vh - 8) ny = vh - rect.height - 8;
    if (nx < 8) nx = 8;
    if (ny < 8) ny = 8;
    setPos({ x: nx, y: ny });
    setVisible(true);
  }, [x, y]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const btnClass =
    "flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors disabled:opacity-30 disabled:pointer-events-none";

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      <div
        ref={menuRef}
        style={{ left: pos.x, top: pos.y, opacity: visible ? 1 : 0 }}
        className="fixed z-50 min-w-45 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl transition-opacity duration-75 dark:border-zinc-700 dark:bg-zinc-800"
      >
        {/* Move */}
        <div className="py-1">
          <button disabled={isFirst} onClick={() => { onMoveUp(); onClose(); }} className={btnClass}>
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2 8 6 4 10 8" />
            </svg>
            Subir sección
          </button>
          <button disabled={isLast} onClick={() => { onMoveDown(); onClose(); }} className={btnClass}>
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2 4 6 8 10 4" />
            </svg>
            Bajar sección
          </button>
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-700" />

        {/* Edit / collapse */}
        <div className="py-1">
          <button onClick={() => { onRename(); onClose(); }} className={btnClass}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2l2 2-7 7H3v-2l7-7z" />
            </svg>
            Renombrar
          </button>
          <button onClick={() => { onToggleCollapse(); onClose(); }} className={btnClass}>
            <svg
              width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={collapsed ? "rotate-180" : ""}
            >
              <polyline points="2 4 6 8 10 4" />
            </svg>
            {collapsed ? "Expandir" : "Colapsar"}
          </button>
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-700" />

        {/* Color swatches */}
        <div className="px-3 py-2.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Color</p>
          <div className="flex flex-wrap gap-2">
            {SECTION_COLORS.map((color, i) => (
              <button
                key={color.key}
                onClick={() => { onSetColor(i); onClose(); }}
                className={`h-5 w-5 rounded-md transition-all ${color.swatch} ${
                  colorIndex === i
                    ? "ring-2 ring-offset-2 ring-zinc-500 dark:ring-zinc-400 dark:ring-offset-zinc-800 scale-110"
                    : "hover:scale-110 opacity-70 hover:opacity-100"
                }`}
                aria-label={color.key}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-700" />

        {/* Delete */}
        <div className="py-1">
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <polyline points="2 4 12 4" /><path d="M5 4V3h4v1" /><rect x="3" y="4" width="8" height="8" rx="1" />
            </svg>
            Eliminar sección
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
