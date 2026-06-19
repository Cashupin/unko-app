"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";

export const CATEGORIES = [
  { value: "RESERVA", label: "Reserva", icon: "📅" },
  { value: "DOCUMENTO", label: "Documento", icon: "📄" },
  { value: "COMPRA", label: "Compra", icon: "🛍️" },
  { value: "OTRO", label: "Otro", icon: "📌" },
] as const;

type ParticipantOption = { id: string; name: string };

type TaskInitial = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  mode: string;
  dueDate: string | null;
  assigneeIds: string[];
};

export function TaskForm({
  tripId,
  tripStartDate,
  participants,
  initial,
  onClose,
}: {
  tripId: string;
  tripStartDate?: string;
  participants: ParticipantOption[];
  initial?: TaskInitial;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!initial;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "OTRO");
  const [mode, setMode] = useState(initial?.mode ?? "SHARED");
  const [dueDate, setDueDate] = useState(initial?.dueDate?.slice(0, 10) ?? "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initial?.assigneeIds ?? []);
  const [loading, setLoading] = useState(false);

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim() ? description.trim() : isEdit ? null : undefined,
        category,
        mode,
        dueDate: dueDate || (isEdit ? null : undefined),
        assigneeIds,
      };
      const url = isEdit ? `/api/tasks/${initial.id}` : `/api/trips/${tripId}/tasks`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al guardar tarea");
      }
      toast.success(isEdit ? "Tarea actualizada" : "Tarea creada");
      router.refresh();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar tarea");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Title */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Título *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ej. Reservar entradas al museo"
          required
          className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
      </div>

      {/* Category */}
      <div>
        <label className="mb-2 block text-xs font-semibold text-zinc-400">Categoría</label>
        <div className="flex gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-semibold transition-colors ${
                category === c.value
                  ? "border-zinc-400 bg-zinc-700 text-zinc-100"
                  : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600"
              }`}
            >
              <span className="text-base">{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Due date — not limited to trip dates: tasks often need to be done before the trip starts */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Fecha límite (opcional)</label>
        <DatePicker
          value={dueDate}
          onChange={setDueDate}
          initialMonth={tripStartDate}
          placeholder="Sin fecha límite"
        />
      </div>

      {/* Assignees */}
      {participants.length > 0 && (
        <div>
          <label className="mb-2 block text-xs font-semibold text-zinc-400">Asignar a</label>
          <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
            {participants.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 cursor-pointer hover:border-zinc-600"
              >
                <input
                  type="checkbox"
                  checked={assigneeIds.includes(p.id)}
                  onChange={() => toggleAssignee(p.id)}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-zinc-100"
                />
                <span className="text-sm text-zinc-200">{p.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Mode — only meaningful with 2+ assignees, but harmless otherwise */}
      {assigneeIds.length >= 2 && (
        <div>
          <label className="mb-2 block text-xs font-semibold text-zinc-400">¿Quién debe completarla?</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("SHARED")}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                mode === "SHARED"
                  ? "border-zinc-400 bg-zinc-700 text-zinc-100"
                  : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600"
              }`}
            >
              <span className="block">Compartida</span>
              <span className="mt-0.5 block text-[10px] font-normal opacity-70">Cualquiera la completa para todos</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("INDIVIDUAL")}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                mode === "INDIVIDUAL"
                  ? "border-zinc-400 bg-zinc-700 text-zinc-100"
                  : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600"
              }`}
            >
              <span className="block">Individual</span>
              <span className="mt-0.5 block text-[10px] font-normal opacity-70">Cada uno tiene su propio check</span>
            </button>
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Notas (opcional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="ej. Reservar con 2 semanas de anticipación"
          className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="flex-1 rounded-xl bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-white transition-colors disabled:opacity-50"
        >
          {loading ? "Guardando..." : isEdit ? "Guardar" : "Crear tarea"}
        </button>
      </div>
    </form>
  );
}
