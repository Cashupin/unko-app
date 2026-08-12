"use client";

import { useState } from "react";
import { FriendLinksPanel } from "./friend-links-panel";
import { FriendRequestsPanel } from "./friend-requests-panel";
import type { WishlistFriendLink, FriendRequest } from "../types";

type Props = {
  tripId: string;
  initialLinks: WishlistFriendLink[];
  pendingRequests: FriendRequest[];
  onRequestUpdate: (id: string, changes: Partial<FriendRequest>) => void;
};

const storageKey = (tripId: string) => `encargos-panel-${tripId}`;

export function EncargosManagementPanel({ tripId, initialLinks, pendingRequests, onRequestUpdate }: Props) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey(tripId)) === "true";
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          localStorage.setItem(storageKey(tripId), String(next));
        }}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <div className="flex items-center gap-2.5">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Gestionar invitaciones</span>
          {pendingRequests.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {pendingRequests.length} pendiente{pendingRequests.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-700">
          <FriendLinksPanel tripId={tripId} initialLinks={initialLinks} />

          {pendingRequests.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Pendientes de revisión ({pendingRequests.length})
              </p>
              <FriendRequestsPanel
                tripId={tripId}
                initialRequests={pendingRequests}
                onRequestUpdate={onRequestUpdate}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
