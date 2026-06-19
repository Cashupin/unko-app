"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TaskForm, CATEGORIES } from "@/modules/checklist/components/task-form";

type Assignee = { id: string; name: string };

type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  dueDate: string | null;
  isDone: boolean;
  assignees: Assignee[];
};

function categoryMeta(category: string) {
  return CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[CATEGORIES.length - 1];
}

function formatDueDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function isOverdue(iso: string | null, isDone: boolean): boolean {
  if (!iso || isDone) return false;
  const due = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function ChecklistPanelClient({
  tripId,
  canEdit,
  tripStartDate,
  tripEndDate,
  participants,
  tasks,
}: {
  tripId: string;
  canEdit: boolean;
  tripStartDate?: string;
  tripEndDate?: string;
  participants: Assignee[];
  tasks: Task[];
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const doneCount = tasks.filter((t) => t.isDone).length;

  async function toggleDone(task: Task) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: !task.isDone }),
    });
    if (res.ok) router.refresh();
    else toast.error("Error al actualizar tarea");
  }

  async function deleteTask(taskId: string, title: string) {
    toast(`¿Eliminar "${title}"?`, {
      action: {
        label: "Eliminar",
        onClick: async () => {
          const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
          if (res.ok) { toast.success("Tarea eliminada"); router.refresh(); }
          else toast.error("Error al eliminar tarea");
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-zinc-500">
          {tasks.length === 0 ? "Sin tareas" : `${doneCount}/${tasks.length} completadas`}
        </span>
        {canEdit && (
          <button
            onClick={() => { setEditingTask(null); setShowModal(true); }}
            className="rounded-xl bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-white transition-colors"
          >
            + Tarea
          </button>
        )}
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-800 p-12 text-center">
          <p className="text-sm text-zinc-600">No hay tareas todavía.{canEdit ? " ¡Agrega la primera!" : ""}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => {
            const meta = categoryMeta(task.category);
            const overdue = isOverdue(task.dueDate, task.isDone);
            return (
              <div
                key={task.id}
                className={`group flex items-start gap-3 rounded-2xl border px-4 py-3.5 transition-colors ${
                  task.isDone
                    ? "border-zinc-800 bg-zinc-900/30 opacity-60"
                    : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                }`}
              >
                <button
                  type="button"
                  onClick={() => canEdit && toggleDone(task)}
                  disabled={!canEdit}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[11px] transition-colors ${
                    task.isDone
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-zinc-600 hover:border-zinc-400"
                  }`}
                >
                  {task.isDone && "✓"}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${task.isDone ? "text-zinc-500 line-through" : "text-zinc-100"}`}>
                    {task.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                      {meta.icon} {meta.label}
                    </span>
                    {task.dueDate && (
                      <span className={`text-xs ${overdue ? "font-semibold text-red-400" : "text-zinc-500"}`}>
                        {overdue ? "⚠ " : ""}{formatDueDate(task.dueDate)}
                      </span>
                    )}
                    {task.assignees.length > 0 && (
                      <span className="text-xs text-zinc-500">
                        👤 {task.assignees.map((a) => a.name).join(", ")}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="mt-1 text-xs italic text-zinc-500">{task.description}</p>
                  )}
                </div>

                {canEdit && (
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => { setEditingTask(task); setShowModal(true); }}
                      className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTask(task.id, task.title)}
                      className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-red-900/40 hover:text-red-400"
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal title={editingTask ? "Editar tarea" : "Nueva tarea"} onClose={() => { setShowModal(false); setEditingTask(null); }}>
          <TaskForm
            tripId={tripId}
            tripStartDate={tripStartDate}
            tripEndDate={tripEndDate}
            participants={participants}
            initial={
              editingTask
                ? {
                    id: editingTask.id,
                    title: editingTask.title,
                    description: editingTask.description,
                    category: editingTask.category,
                    dueDate: editingTask.dueDate,
                    assigneeIds: editingTask.assignees.map((a) => a.id),
                  }
                : undefined
            }
            onClose={() => { setShowModal(false); setEditingTask(null); }}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative z-10 w-full max-w-md rounded-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-100">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-300">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
