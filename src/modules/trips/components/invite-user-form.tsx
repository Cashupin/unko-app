"use client";

import { useState } from "react";

interface InvitationResult {
  email: string;
  expiresAt: string;
}

export function InviteUserForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<InvitationResult | null>(null);

  function openModal() {
    setError(null);
    setSuccess(null);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string).trim().toLowerCase();

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await res.json()) as {
        error?: string;
        email?: string;
        expiresAt?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Error al crear la invitación");
        return;
      }

      setSuccess({ email: data.email!, expiresAt: data.expiresAt! });
      (e.target as HTMLFormElement).reset();
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
      >
        Invitar usuario
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">
                Invitar usuario
              </h2>
              <button
                onClick={closeModal}
                className="text-zinc-400 hover:text-zinc-600"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {success ? (
              /* Success state */
              <div className="flex flex-col gap-4">
                <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
                  <p className="font-medium">Invitación creada</p>
                  <p className="mt-1">
                    Pídele a{" "}
                    <span className="font-mono font-semibold">
                      {success.email}
                    </span>{" "}
                    que inicie sesión en la app con su cuenta de Google.
                  </p>
                  <p className="mt-2 text-xs text-green-600">
                    Expira el{" "}
                    {new Date(success.expiresAt).toLocaleDateString("es", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setSuccess(null);
                      setError(null);
                    }}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
                  >
                    Invitar otro
                  </button>
                  <button
                    onClick={closeModal}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              /* Form state */
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="email"
                    className="text-xs font-medium text-zinc-700"
                  >
                    Correo electrónico
                    <span className="ml-0.5 text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    placeholder="usuario@ejemplo.com"
                    autoComplete="off"
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                  <p className="text-xs text-zinc-400">
                    La invitación es válida por 7 días.
                  </p>
                </div>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                  >
                    {loading ? "Enviando..." : "Invitar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
