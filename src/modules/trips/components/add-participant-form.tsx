"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddParticipantForm({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/trips/${tripId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = (await res.json()) as { name?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Error al agregar participante");
        return;
      }

      setSuccess(`${data.name ?? email} fue agregado al viaje`);
      setEmail("");
      router.refresh();
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <p className="text-xs font-medium text-zinc-700">Agregar participante</p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@ejemplo.com"
          disabled={loading}
          className="flex-1 min-w-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {loading ? "..." : "Agregar"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {success && <p className="text-xs text-green-600">{success}</p>}
    </form>
  );
}
