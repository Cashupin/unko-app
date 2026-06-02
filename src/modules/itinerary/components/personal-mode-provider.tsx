"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreatePersonalActivityForm } from "@/modules/itinerary/components/create-personal-activity-form";

// ─── Context ──────────────────────────────────────────────────────────────────

const PersonalModeContext = createContext<{
  show: boolean;
  toggle: () => void;
}>({ show: false, toggle: () => {} });

const STORAGE_KEY = "itinerary-personal-mode";

export function PersonalModeProvider({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  function toggle() {
    setShow((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <PersonalModeContext.Provider value={{ show, toggle }}>
      {children}
    </PersonalModeContext.Provider>
  );
}

// ─── Toggle button ────────────────────────────────────────────────────────────

export function PersonalModeToggle() {
  const { show, toggle } = useContext(PersonalModeContext);
  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
        show
          ? "border-violet-700/60 bg-violet-900/30 text-violet-300 hover:bg-violet-900/50"
          : "border-[#27272a] bg-[#18191c]/60 text-zinc-400 hover:bg-[#27272a] hover:text-zinc-200"
      }`}
    >
      🔒 {show ? "Ocultar mi plan" : "Mi plan"}
    </button>
  );
}

// ─── Personal activity section (per day) ─────────────────────────────────────

type PersonalActivityItem = {
  id: string;
  title: string;
  description: string | null;
  time: string | null;
  location: string | null;
  notes: string | null;
  photoUrl: string | null;
};

function PersonalRow({
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
      await fetch(`/api/trips/${tripId}/personal-activities/${activity.id}`, {
        method: "DELETE",
      });
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="group flex items-start gap-3 rounded-xl border border-violet-700/25 bg-violet-950/30 px-4 py-3.5 transition-colors hover:border-violet-700/50">
      {/* Time badge — same width as ActivityRow */}
      <div className="w-12 shrink-0 pt-0.5">
        {activity.time ? (
          <div className="rounded-lg bg-violet-900/50 px-1.5 py-1.5 text-center">
            <span className="text-xs font-bold tabular-nums text-violet-300">
              {activity.time}
            </span>
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold leading-snug text-violet-100">
            {activity.title}
          </p>
          <span className="shrink-0 rounded-full border border-violet-700/40 bg-violet-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-violet-400">
            🔒 Solo yo
          </span>
        </div>

        {activity.description && (
          <p className="mt-1.5 text-sm leading-relaxed text-violet-200/70">
            {activity.description}
          </p>
        )}

        {activity.location && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1 text-xs font-medium text-violet-400/70 transition-colors hover:text-violet-300"
          >
            <span>📍</span>
            {activity.location}
          </a>
        )}

        {activity.notes && (
          <p className="mt-1.5 text-xs italic text-violet-400/60">{activity.notes}</p>
        )}
      </div>

      {/* Photo */}
      {activity.photoUrl && (
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-violet-700/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activity.photoUrl} alt={activity.title} className="h-full w-full object-cover" />
        </div>
      )}

      {/* Delete on hover */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="mt-0.5 shrink-0 rounded-lg p-1.5 text-violet-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-violet-900/40 hover:text-violet-400 disabled:opacity-40"
        aria-label="Eliminar"
      >
        {deleting ? (
          <span className="text-xs">…</span>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function PersonalActivitySection({
  activities,
  tripId,
  date,
}: {
  activities: PersonalActivityItem[];
  tripId: string;
  date: string;
}) {
  const { show } = useContext(PersonalModeContext);
  if (!show) return null;

  return (
    <div className="flex flex-col gap-2 px-3 pb-3">
      {activities.map((pa) => (
        <PersonalRow key={pa.id} activity={pa} tripId={tripId} />
      ))}
      <CreatePersonalActivityForm tripId={tripId} date={date} />
    </div>
  );
}
