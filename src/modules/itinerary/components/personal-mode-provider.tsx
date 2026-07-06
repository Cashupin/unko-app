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
      title={show ? "Ocultar mi plan" : "Mi plan"}
      className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
        show
          ? "border-violet-700/60 bg-violet-900/30 text-violet-300 hover:bg-violet-900/50"
          : "border-[#27272a] bg-[#18191c]/60 text-zinc-400 hover:bg-[#27272a] hover:text-zinc-200"
      }`}
    >
      🔒<span className="ml-1 hidden md:inline">{show ? "Ocultar mi plan" : "Mi plan"}</span>
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
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editTitle, setEditTitle] = useState(activity.title);
  const [editDescription, setEditDescription] = useState(activity.description ?? "");
  const [editLocation, setEditLocation] = useState(activity.location ?? "");
  const [editTime, setEditTime] = useState(activity.time ?? "");
  const [editNotes, setEditNotes] = useState(activity.notes ?? "");

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

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTitle.trim()) return;
    setEditLoading(true);
    try {
      const res = await fetch(
        `/api/trips/${tripId}/personal-activities/${activity.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editTitle.trim(),
            description: editDescription.trim() || null,
            location: editLocation.trim() || null,
            time: editTime || null,
            notes: editNotes.trim() || null,
          }),
        }
      );
      if (!res.ok) return;
      setEditOpen(false);
      router.refresh();
    } finally {
      setEditLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-violet-700/40 bg-[#18191c] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500";

  return (
    <>
      <div className="group flex items-start gap-3 rounded-xl border border-violet-700/25 bg-violet-950/30 px-4 py-3.5 transition-colors hover:border-violet-700/50">
        {/* Time badge */}
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

        {/* Edit + delete on hover */}
        <div className="flex shrink-0 items-center gap-0.5 mt-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => {
              setEditTitle(activity.title);
              setEditDescription(activity.description ?? "");
              setEditLocation(activity.location ?? "");
              setEditTime(activity.time ?? "");
              setEditNotes(activity.notes ?? "");
              setEditOpen(true);
            }}
            className="rounded-lg p-1.5 text-violet-600 hover:bg-violet-900/40 hover:text-violet-400 transition-colors"
            aria-label="Editar"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg p-1.5 text-violet-600 hover:bg-violet-900/40 hover:text-violet-400 disabled:opacity-40 transition-colors"
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
      </div>

      {/* Edit modal */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-[#0f1419] p-6 shadow-2xl ring-1 ring-violet-700/30 max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-violet-100">🔒 Editar mi plan</h2>
                <p className="mt-0.5 text-xs text-violet-400/70">Solo visible para ti</p>
              </div>
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-lg p-1.5 text-violet-500 transition-colors hover:bg-violet-900/40 hover:text-violet-300"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEdit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-violet-300">Título <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-violet-300">Descripción</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-violet-300">Ubicación</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="Ej: Mercado Nishiki, Kyoto"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-violet-300">Hora</label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-violet-300">Notas</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={editLoading}
                  className="rounded-lg border border-[#27272a] px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-[#27272a] disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading || !editTitle.trim()}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                >
                  {editLoading ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function PersonalRowConditional({
  activity,
  tripId,
}: {
  activity: PersonalActivityItem;
  tripId: string;
}) {
  const { show } = useContext(PersonalModeContext);
  if (!show) return null;
  return <PersonalRow activity={activity} tripId={tripId} />;
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
