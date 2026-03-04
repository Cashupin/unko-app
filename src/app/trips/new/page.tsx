"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DatePicker } from "@/components/date-picker";
import { toast } from "sonner";

const CURRENCIES = [
  { value: "CLP", label: "CLP — Peso Chileno" },
  { value: "JPY", label: "JPY — Yen Japonés" },
  { value: "USD", label: "USD — Dólar Americano" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — Libra Esterlina" },
  { value: "KRW", label: "KRW — Won Coreano" },
  { value: "CNY", label: "CNY — Yuan Chino" },
  { value: "THB", label: "THB — Baht Tailandés" },
];

export default function NewTripPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);

    const body: Record<string, string | undefined> = {
      name: (fd.get("name") as string).trim(),
      defaultCurrency: fd.get("defaultCurrency") as string,
    };

    const description = (fd.get("description") as string).trim();
    const destination = (fd.get("destination") as string).trim();
    const startDate = fd.get("startDate") as string;
    const endDate = fd.get("endDate") as string;

    if (description) body.description = description;
    if (destination) body.destination = destination;
    if (startDate) body.startDate = new Date(startDate).toISOString();
    if (endDate) body.endDate = new Date(endDate).toISOString();

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { id?: string; error?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Error al crear el viaje");
        return;
      }

      router.push(`/trips/${data.id}`);
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0E1113]">
      <header className="border-b border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4 md:px-6">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Mis viajes
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Nuevo viaje</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col gap-5 dark:border-zinc-700 dark:bg-zinc-800 md:p-6"
        >
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Nombre del viaje <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={1}
              maxLength={255}
              placeholder="Ej: Japón 2025"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
            />
          </div>

          {/* Destination */}
          <div className="flex flex-col gap-1">
            <label htmlFor="destination" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Destino
            </label>
            <input
              id="destination"
              name="destination"
              type="text"
              maxLength={500}
              placeholder="Ej: Tokyo, Osaka, Kyoto"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
            />
          </div>

          {/* Dates */}
          <div className="flex flex-col gap-1">
            <label htmlFor="startDate" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Fecha de inicio
            </label>
            <DatePicker
              id="startDate"
              name="startDate"
              placeholder="Seleccionar fecha"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="endDate" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Fecha de término
            </label>
            <DatePicker
              id="endDate"
              name="endDate"
              placeholder="Seleccionar fecha"
            />
          </div>

          {/* Currency */}
          <div className="flex flex-col gap-1">
            <label htmlFor="defaultCurrency" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Moneda principal
            </label>
            <select
              id="defaultCurrency"
              name="defaultCurrency"
              defaultValue="CLP"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:ring-zinc-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={1000}
              placeholder="Notas sobre el viaje (opcional)"
              className="resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Link
              href="/dashboard"
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Creando..." : "Crear viaje"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
