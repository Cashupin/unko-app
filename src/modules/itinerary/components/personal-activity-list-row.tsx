"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PersonalActivityItem = {
  id: string;
  title: string;
  time: string | null;
  notes: string | null;
  location: string | null;
};

export function PersonalActivityListRow({
  activity,
  tripId,
}: {
  activity: PersonalActivityItem;
  tripId: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/trips/${tripId}/personal-activities/${activity.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="group flex items-start gap-3 rounded-xl border border-violet-700/30 bg-violet-900/15 px-4 py-3.5 transition-colors hover:border-violet-700/50">
      {/* Time badge */}
      <div className="w-12 shrink-0 pt-0.5">
        {activity.time ? (
          <div className="rounded-lg bg-violet-900/60 px-1.5 py-1.5 text-center">
            <span className="text-xs font-bold tabular-nums text-violet-300">{activity.time}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center pt-1">
            <span className="text-xs text-violet-500">🔒</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {!activity.time && <span className="text-xs text-violet-500">🔒</span>}
          <p className="font-semibold text-violet-100 text-sm leading-snug">{activity.title}</p>
          <span className="shrink-0 rounded-full border border-violet-700/40 bg-violet-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-violet-400">
            Solo yo
          </span>
        </div>
        {activity.location && (
          <p className="mt-1 text-xs text-violet-400/70">📍 {activity.location}</p>
        )}
        {activity.notes && (
          <p className="mt-1 text-xs italic text-violet-400/60">{activity.notes}</p>
        )}
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="mt-0.5 shrink-0 rounded-lg p-1.5 text-violet-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-violet-900/40 hover:text-violet-400 disabled:opacity-40"
        aria-label="Eliminar"
      >
        {deleting ? "…" : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>
    </div>
  );
}
