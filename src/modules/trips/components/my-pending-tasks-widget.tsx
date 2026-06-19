"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const TASK_CATEGORY_ICONS: Record<string, string> = {
  RESERVA: "📅", DOCUMENTO: "📄", COMPRA: "🛍️", OTRO: "📌",
};

type PendingTask = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  mode: string;
  dueDate: string | null;
};

function fmtShort(d: string): string {
  return new Date(d).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function isOverdue(d: string | null): boolean {
  if (!d) return false;
  const due = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function MyPendingTasksWidget({
  tripId,
  myParticipantId,
  tasks,
  totalCount,
}: {
  tripId: string;
  myParticipantId: string;
  tasks: PendingTask[];
  totalCount: number;
}) {
  const router = useRouter();
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleCheck(task: PendingTask) {
    setLoadingId(task.id);
    setCheckedIds((prev) => new Set(prev).add(task.id));
    try {
      const url =
        task.mode === "INDIVIDUAL"
          ? `/api/tasks/${task.id}/assignees/${myParticipantId}`
          : `/api/tasks/${task.id}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDone: true }),
      });
      if (!res.ok) {
        toast.error("Error al marcar tarea");
        setCheckedIds((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
        return;
      }
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-100 dark:border-[#27272a] bg-white dark:bg-[#18191c] overflow-hidden">
      <div className="flex flex-col divide-y divide-zinc-100 dark:divide-[#27272a]">
        {tasks.map((task) => {
          const checked = checkedIds.has(task.id);
          const overdue = isOverdue(task.dueDate);
          return (
            <div
              key={task.id}
              className={`flex items-start gap-2.5 px-3.5 py-3 transition-opacity ${checked ? "opacity-40" : ""}`}
            >
              <button
                type="button"
                onClick={() => !checked && handleCheck(task)}
                disabled={checked || loadingId === task.id}
                aria-label="Marcar como completada"
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[11px] transition-colors ${
                  checked
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-600 dark:hover:border-zinc-400"
                }`}
              >
                {checked && "✓"}
              </button>
              <span className="mt-0.5 text-[15px] shrink-0">{TASK_CATEGORY_ICONS[task.category] ?? "📌"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`min-w-0 truncate text-[13px] font-semibold ${
                      checked ? "text-zinc-400 line-through dark:text-zinc-600" : "text-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.dueDate && !checked && (
                    <span
                      className={`text-[11px] shrink-0 ${
                        overdue ? "font-semibold text-red-500 dark:text-red-400" : "text-zinc-400 dark:text-zinc-500"
                      }`}
                    >
                      {overdue ? "⚠ " : ""}{fmtShort(task.dueDate)}
                    </span>
                  )}
                </div>
                {task.description && !checked && (
                  <p className="mt-0.5 text-[11px] italic text-zinc-400 dark:text-zinc-500 truncate">
                    {task.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {totalCount > tasks.length && (
        <Link
          href={`/trips/${tripId}?tab=checklist`}
          className="block px-3.5 py-2.5 text-center text-[11px] text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400 transition-colors border-t border-zinc-100 dark:border-[#27272a]"
        >
          +{totalCount - tasks.length} más
        </Link>
      )}
    </div>
  );
}
