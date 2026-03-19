"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useNotifications, type AppNotification } from "@/modules/notifications/components/notifications-provider";

const TYPE_ICON: Record<string, string> = {
  TRIP_ADDED: "✈️",
  EXPENSE_CREATED: "💸",
  PAYMENT_RECEIVED: "✅",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min}m`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function NotificationRow({ n }: { n: AppNotification }) {
  const icon = TYPE_ICON[n.type] ?? "🔔";
  const inner = (
    <div
      className={`flex gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/60 ${
        !n.isRead ? "bg-blue-50/60 dark:bg-blue-900/10" : ""
      }`}
    >
      <span className="text-xl shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
          {n.title}
        </p>
        {n.body && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug line-clamp-2">
            {n.body}
          </p>
        )}
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{timeAgo(n.createdAt)}</p>
      </div>
      {!n.isRead && (
        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
      )}
    </div>
  );

  if (n.link) {
    return <Link href={n.link}>{inner}</Link>;
  }
  return inner;
}

export function NotificationsBell() {
  const { notifications, unreadCount, loading, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar al click afuera
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleOpen() {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) {
      // Marcar como leídas al abrir
      markAllRead();
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        aria-label="Notificaciones"
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-600 dark:text-zinc-300"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Notificaciones
            </span>
            {loading && (
              <span className="text-xs text-zinc-400">Actualizando...</span>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-700/60">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-sm text-zinc-400 dark:text-zinc-500">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationRow key={n.id} n={n} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
