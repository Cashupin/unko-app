"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Participant = {
  id: string;
  name: string;
  type: "REGISTERED" | "GHOST";
  role: "ADMIN" | "EDITOR" | "VIEWER";
  user: { id: string; name: string | null; image: string | null; email: string } | null;
};

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "EDITOR", label: "Editor" },
  { value: "VIEWER", label: "Invitado" },
] as const;

function ParticipantRow({
  participant,
  tripId,
  currentUserId,
}: {
  participant: Participant;
  tripId: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState(false);
  const [loadingRemove, setLoadingRemove] = useState(false);

  const isSelf = participant.user?.id === currentUserId;

  async function handleRoleChange(newRole: string) {
    setLoadingRole(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/participants/${participant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Error al cambiar rol");
        return;
      }
      router.refresh();
    } finally {
      setLoadingRole(false);
    }
  }

  async function doRemove() {
    setLoadingRemove(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/participants/${participant.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Error al eliminar participante");
        return;
      }
      router.refresh();
      toast.success(`${participant.name} eliminado del viaje`);
    } finally {
      setLoadingRemove(false);
    }
  }

  function handleRemove() {
    toast(`¿Eliminar a ${participant.name} del viaje?`, {
      position: "top-center",
      action: { label: "Eliminar", onClick: doRemove },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  }

  return (
    <li className="flex items-center gap-2.5">
      {participant.user?.image ? (
        <Image
          src={participant.user.image}
          alt={participant.name}
          width={28}
          height={28}
          className="rounded-full shrink-0"
        />
      ) : (
        <div className="h-7 w-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-500 shrink-0 dark:bg-zinc-700 dark:text-zinc-400">
          {participant.name[0]?.toUpperCase()}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-800 truncate dark:text-zinc-200">
          {participant.name}
          {participant.type === "GHOST" && (
            <span className="ml-1 text-xs text-zinc-400 dark:text-zinc-500">(fantasma)</span>
          )}
        </p>
      </div>

      <select
        value={participant.role}
        onChange={(e) => handleRoleChange(e.target.value)}
        disabled={loadingRole}
        className="shrink-0 rounded-lg border border-zinc-200 bg-white py-1 px-2 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
      >
        {ROLE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {!isSelf && (
        <button
          onClick={handleRemove}
          disabled={loadingRemove}
          className="shrink-0 text-sm text-zinc-400 hover:text-red-500 disabled:opacity-50 transition-colors"
          aria-label={`Eliminar a ${participant.name}`}
        >
          ✕
        </button>
      )}
    </li>
  );
}

// ─── Add participant section ────────────────────────────────────────────────────

function AddParticipantSection({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"email" | "ghost">("email");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingInviteEmail, setPendingInviteEmail] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);

    const body =
      mode === "email"
        ? { type: "REGISTERED", email: value.trim().toLowerCase() }
        : { type: "GHOST", name: value.trim() };

    try {
      const res = await fetch(`/api/trips/${tripId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { name?: string; error?: string; notInSystem?: boolean };

      if (!res.ok) {
        if (data.notInSystem) {
          setPendingInviteEmail(value.trim().toLowerCase());
          return;
        }
        toast.error(data.error ?? "Error al agregar participante");
        return;
      }

      toast.success(
        mode === "ghost"
          ? `${data.name ?? value} agregado como participante fantasma`
          : `${data.name ?? value} fue agregado al viaje`,
      );
      setValue("");
      router.refresh();
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendTripInvite() {
    if (!pendingInviteEmail) return;
    setInviting(true);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingInviteEmail, tripId, tripRole: "VIEWER" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Error al enviar invitación");
        return;
      }
      toast.success(`Invitación enviada a ${pendingInviteEmail}. Se unirá al viaje cuando se registre.`);
      setPendingInviteEmail(null);
      setValue("");
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setInviting(false);
    }
  }

  if (pendingInviteEmail) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          <span className="font-semibold">{pendingInviteEmail}</span> no tiene cuenta aún.
        </p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          ¿Enviar una invitación al viaje? Se unirá automáticamente cuando se registre.
        </p>
        <div className="mt-2.5 flex gap-2">
          <button
            onClick={() => setPendingInviteEmail(null)}
            disabled={inviting}
            className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSendTripInvite}
            disabled={inviting}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {inviting ? "Enviando..." : "Enviar invitación"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex rounded-lg border border-zinc-200 overflow-hidden text-xs dark:border-zinc-700">
        <button
          type="button"
          onClick={() => { setMode("email"); setValue(""); }}
          className={`flex-1 py-1.5 font-medium transition-colors ${
            mode === "email"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "bg-white text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-700 dark:text-zinc-400"
          }`}
        >
          Por email
        </button>
        <button
          type="button"
          onClick={() => { setMode("ghost"); setValue(""); }}
          className={`flex-1 py-1.5 font-medium transition-colors ${
            mode === "ghost"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "bg-white text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-700 dark:text-zinc-400"
          }`}
        >
          Fantasma
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type={mode === "email" ? "email" : "text"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === "email" ? "email@ejemplo.com" : "Nombre (ej: Juan)"}
          disabled={loading}
          className="flex-1 min-w-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "..." : "Agregar"}
        </button>
      </div>

      {mode === "ghost" && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Un participante fantasma no necesita cuenta. Solo se usa para dividir gastos.
        </p>
      )}
    </form>
  );
}

// ─── Main — modal with trigger button ─────────────────────────────────────────

export function ManageParticipantsPanel({
  tripId,
  participants,
  currentUserId,
  isAdmin,
  variant = "menu",
}: {
  tripId: string;
  participants: Participant[];
  currentUserId: string;
  isAdmin: boolean;
  /** "menu" = menu item style (default); "inline" = plain text link style */
  variant?: "menu" | "inline";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          variant === "menu"
            ? "w-full rounded-lg px-4 py-2.5 text-left text-sm text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-700"
            : "text-[11px] text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
        }
      >
        {variant === "menu" ? "Gestionar participantes" : "Gestionar →"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto dark:bg-zinc-800">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Participantes
                </h2>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                  {participants.length}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Participant list */}
            <div className="px-6 py-4">
              <ul className="flex flex-col gap-3">
                {participants.map((p) =>
                  isAdmin ? (
                    <ParticipantRow
                      key={p.id}
                      participant={p}
                      tripId={tripId}
                      currentUserId={currentUserId}
                    />
                  ) : (
                    <li key={p.id} className="flex items-center gap-2.5">
                      {p.user?.image ? (
                        <Image
                          src={p.user.image}
                          alt={p.name}
                          width={28}
                          height={28}
                          className="rounded-full shrink-0"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-500 shrink-0 dark:bg-zinc-700 dark:text-zinc-400">
                          {p.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-800 truncate dark:text-zinc-200">
                          {p.name}
                          {p.type === "GHOST" && (
                            <span className="ml-1 text-xs text-zinc-400 dark:text-zinc-500">(fantasma)</span>
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                        {{ ADMIN: "Admin", EDITOR: "Editor", VIEWER: "Invitado" }[p.role]}
                      </span>
                    </li>
                  ),
                )}
              </ul>

              {isAdmin && (
                <div className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-700">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3">
                    Agregar participante
                  </p>
                  <AddParticipantSection tripId={tripId} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
