"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CreatePersonalActivityForm } from "@/modules/itinerary/components/create-personal-activity-form";
import { CreateActivityForm } from "@/modules/itinerary/components/create-activity-form";

// ─── Context ──────────────────────────────────────────────────────────────────

// 0 = off (solo grupal), 1 = combinado, 2 = solo mi plan
type PersonalMode = 0 | 1 | 2;

const PersonalModeContext = createContext<{
  mode: PersonalMode;
  cycle: () => void;
}>({ mode: 0, cycle: () => {} });

const STORAGE_KEY = "itinerary-personal-mode";

export function usePersonalMode() {
  return useContext(PersonalModeContext);
}

export function PersonalModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PersonalMode>(0);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? parseInt(stored, 10) : 0;
    setMode((parsed === 1 || parsed === 2 ? parsed : 0) as PersonalMode);
  }, []);

  function cycle() {
    setMode((v) => {
      const next = ((v + 1) % 3) as PersonalMode;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <PersonalModeContext.Provider value={{ mode, cycle }}>
      {children}
    </PersonalModeContext.Provider>
  );
}

// ─── Toggle button ────────────────────────────────────────────────────────────

const TOGGLE_LABELS: Record<PersonalMode, string> = {
  0: "Mi Plan",
  1: "Mi Plan",
  2: "Solo yo",
};

const TOGGLE_DOTS: Record<PersonalMode, string | null> = {
  0: null,
  1: "●",
  2: "●",
};

export function PersonalModeToggle() {
  const { mode, cycle } = useContext(PersonalModeContext);

  const styles: Record<PersonalMode, string> = {
    0: "border-[#27272a] bg-[#18191c]/60 text-zinc-400 hover:bg-[#27272a] hover:text-zinc-200",
    1: "border-sky-500/40 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 hover:text-sky-300",
    2: "border-sky-400/80 bg-sky-500/40 text-sky-100 hover:bg-sky-500/50",
  };

  return (
    <button
      type="button"
      onClick={cycle}
      title={mode === 0 ? "Activar Mi Plan" : mode === 1 ? "Ver solo Mi Plan" : "Desactivar Mi Plan"}
      className={`relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${styles[mode]}`}
    >
      {/* Mobile: solo icono persona */}
      <svg className="h-3.5 w-3.5 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      {mode === 1 && (
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full border border-sky-400/60 bg-sky-500/40 md:hidden" />
      )}
      {mode === 2 && (
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-sky-400 md:hidden" />
      )}
      {/* Desktop: punto + texto */}
      {TOGGLE_DOTS[mode] && (
        <span className="hidden md:inline text-[8px] leading-none">{TOGGLE_DOTS[mode]}</span>
      )}
      <span className="hidden md:inline">{TOGGLE_LABELS[mode]}</span>
    </button>
  );
}

// ─── Personal activity type ───────────────────────────────────────────────────

type PersonalActivityItem = {
  id: string;
  title: string;
  description: string | null;
  time: string | null;
  location: string | null;
  notes: string | null;
  photoUrl: string | null;
};

// ─── PersonalRow (card normalizada) ──────────────────────────────────────────

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
    "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500";

  return (
    <>
      <div className="group relative flex items-start gap-3 rounded-xl px-4 py-3.5 bg-[#1f2023] border border-transparent hover:border-[#3f3f46] transition-colors">
        {/* Left accent bar */}
        <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-sky-500/50" />

        {/* Time badge */}
        <div className="w-12 shrink-0 pt-0.5">
          {activity.time ? (
            <div className="rounded-lg bg-[#27272a] px-1.5 py-1.5 text-center">
              <span className="text-xs font-bold tabular-nums text-zinc-300">
                {activity.time}
              </span>
            </div>
          ) : null}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold leading-snug text-zinc-100">
              {activity.title}
            </p>
            <span className="shrink-0 text-[10px] font-medium text-zinc-500">
              · Personal
            </span>
          </div>

          {activity.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              {activity.description}
            </p>
          )}

          {activity.location && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
            >
              <span>📍</span>
              {activity.location}
            </a>
          )}

          {activity.notes && (
            <p className="mt-1.5 text-xs italic text-zinc-500">{activity.notes}</p>
          )}
        </div>

        {/* Photo */}
        {activity.photoUrl && (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#3f3f46]">
            <Image fill src={activity.photoUrl} alt={activity.title} className="object-cover" />
          </div>
        )}

        {/* Edit + delete on hover — mismos iconos que actividades grupales */}
        <div className="flex shrink-0 items-center gap-0.5 mt-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
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
            className="rounded-md px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
            aria-label="Editar"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-[#27272a] hover:text-red-400 disabled:opacity-40 transition-colors"
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

      {/* Edit modal — colores normales, sin violeta */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-6 shadow-2xl ring-1 ring-zinc-700 max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-100">Editar Mi Plan</h2>
                <p className="mt-0.5 text-xs text-zinc-500">Solo visible para ti</p>
              </div>
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEdit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-300">Título <span className="text-red-400">*</span></label>
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
                <label className="text-xs font-medium text-zinc-300">Descripción</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-300">Ubicación</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="Ej: Mercado Nishiki, Kyoto"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-300">Hora</label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-300">Notas</label>
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
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading || !editTitle.trim()}
                  className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
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

// ─── PersonalRowConditional — para uso en el merge del calendario ─────────────

export function PersonalRowConditional({
  activity,
  tripId,
}: {
  activity: PersonalActivityItem;
  tripId: string;
}) {
  const { mode } = useContext(PersonalModeContext);
  if (mode === 0) return null;
  return <PersonalRow activity={activity} tripId={tripId} />;
}

// ─── PersonalActivitySection — sección por día ───────────────────────────────

export function PersonalActivitySection({
  activities,
  tripId,
  date,
}: {
  activities: PersonalActivityItem[];
  tripId: string;
  date: string;
}) {
  const { mode } = useContext(PersonalModeContext);
  if (mode === 0) return null;

  if (activities.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 px-3 pb-3">
      {activities.map((pa) => (
        <PersonalRow key={pa.id} activity={pa} tripId={tripId} />
      ))}
    </div>
  );
}

// ─── PersonalUnscheduledSection — Mi Plan sin fecha ──────────────────────────

export function PersonalUnscheduledSection({
  activities,
  tripId,
}: {
  activities: PersonalActivityItem[];
  tripId: string;
}) {
  const { mode } = useContext(PersonalModeContext);
  const [open, setOpen] = useState(true);

  if (mode === 0) return null;
  if (activities.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#27272a] bg-[#18191c] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 md:px-5 md:py-4 ${open ? "border-b border-[#27272a]" : ""}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#27272a]">
            <div className="h-4 w-0.5 rounded-full bg-zinc-500/60" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-zinc-300">
              Por programar <span className="text-zinc-500 font-normal">· Personal</span>
            </p>
            <p className="text-xs text-zinc-500">
              {activities.length} actividad{activities.length !== 1 ? "es" : ""} sin fecha asignada
            </p>
          </div>
        </div>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
          className={`shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M5 6.5L1 2.5h8L5 6.5z" />
        </svg>
      </button>

      {open && (
        <div className="flex flex-col gap-2 p-3">
          {activities.map((pa) => (
            <PersonalRow key={pa.id} activity={pa} tripId={tripId} />
          ))}
          <CreatePersonalActivityForm tripId={tripId} date={null} />
        </div>
      )}
    </div>
  );
}

// ─── GroupActivityInMode2 — envuelve actividades grupales para modo 2 ─────────
// En modo 2 (Solo Mi Plan) las actividades grupales se muestran como texto mínimo.
// En modos 0 y 1 renderiza children normalmente.

export function GroupActivityInMode2({
  time,
  title,
  children,
}: {
  time?: string | null;
  title: string;
  children: React.ReactNode;
}) {
  const { mode } = useContext(PersonalModeContext);

  if (mode !== 2) return <>{children}</>;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5">
      {time ? (
        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-zinc-600">{time}</span>
      ) : (
        <span className="w-12 shrink-0" />
      )}
      <span className="text-xs text-zinc-500 truncate">{title}</span>
    </div>
  );
}

// ─── SmartCreateButton — muestra el formulario correcto según el modo ─────────
// En modo 0: formulario de actividad grupal.
// En modo 1 o 2: formulario de actividad personal (Mi Plan).

export function SmartCreateButton({
  tripId,
  date,
  tripStartDate,
  isAdmin,
  compact = true,
}: {
  tripId: string;
  date?: string;
  tripStartDate?: string;
  isAdmin?: boolean;
  compact?: boolean;
}) {
  const { mode } = useContext(PersonalModeContext);

  if (mode === 0) {
    return (
      <CreateActivityForm
        tripId={tripId}
        defaultDate={date}
        tripStartDate={tripStartDate}
        isAdmin={isAdmin}
        compact={compact}
      />
    );
  }

  return (
    <CreatePersonalActivityForm
      tripId={tripId}
      date={date ?? null}
      tripStartDate={tripStartDate}
      compact={compact}
    />
  );
}
