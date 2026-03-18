"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCY_OPTIONS } from "@/lib/constants";
import { DatePicker } from "@/components/date-picker";
import { LocationInput } from "@/components/location-input";
import { toast } from "sonner";

function toYMD(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  return new Date(d).toISOString().slice(0, 10);
}

type Hotel = {
  id: string;
  name: string;
  link: string | null;
  checkInDate: Date;
  checkOutDate: Date;
  pricePerNight: number | null;
  currency: string;
  address: string | null;
  notes: string | null;
  reserved: boolean;
};

export function EditHotelForm({
  tripId,
  hotel,
  tripStartDate,
  tripEndDate,
}: {
  tripId: string;
  hotel: Hotel;
  tripStartDate?: Date | null;
  tripEndDate?: Date | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const rawPrice = (fd.get("pricePerNight") as string).trim();
    const body: Record<string, string | number | boolean | null | undefined> = {
      name: (fd.get("name") as string).trim(),
      checkInDate: fd.get("checkInDate") as string,
      checkOutDate: fd.get("checkOutDate") as string,
      currency: fd.get("currency") as string,
      reserved: fd.get("reserved") === "on",
      link: (fd.get("link") as string).trim() || null,
      address: (fd.get("address") as string).trim() || null,
      notes: (fd.get("notes") as string).trim() || null,
      pricePerNight: rawPrice ? parseFloat(rawPrice) : null,
    };

    try {
      const res = await fetch(`/api/trips/${tripId}/hotels/${hotel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Error al guardar");
        return;
      }

      setOpen(false);
      router.refresh();
      toast.success("Alojamiento actualizado");
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300 disabled:opacity-50"
        aria-label="Editar alojamiento"
      >
        ✎
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto dark:bg-zinc-800">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Editar alojamiento</h2>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300" aria-label="Cerrar">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="edit-hotel-name" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-hotel-name" name="name" type="text" required
                  minLength={1} maxLength={200}
                  defaultValue={hotel.name}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="edit-hotel-link" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Enlace (Booking, etc.)</label>
                <input
                  id="edit-hotel-link" name="link" type="url"
                  defaultValue={hotel.link ?? ""}
                  placeholder="https://... (opcional)"
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="edit-hotel-address" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Dirección</label>
                <LocationInput
                  id="edit-hotel-address"
                  name="address"
                  nameLat="address_lat"
                  nameLng="address_lng"
                  defaultValue={hotel.address ?? ""}
                  placeholder="Buscar dirección... (opcional)"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="edit-checkInDate" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Check-in <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  id="edit-checkInDate"
                  name="checkInDate"
                  placeholder="Seleccionar fecha"
                  defaultValue={toYMD(hotel.checkInDate)}
                  min={toYMD(tripStartDate)}
                  max={toYMD(tripEndDate)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="edit-checkOutDate" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Check-out <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  id="edit-checkOutDate"
                  name="checkOutDate"
                  placeholder="Seleccionar fecha"
                  defaultValue={toYMD(hotel.checkOutDate)}
                  min={toYMD(tripStartDate)}
                  max={toYMD(tripEndDate)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-pricePerNight" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Precio por noche</label>
                  <input
                    id="edit-pricePerNight" name="pricePerNight" type="number" min="0" max="999999999" step="0.01"
                    defaultValue={hotel.pricePerNight ?? ""}
                    placeholder="0.00 (opcional)"
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-hotel-currency" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Moneda</label>
                  <select
                    id="edit-hotel-currency" name="currency" defaultValue={hotel.currency}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:ring-zinc-500"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="edit-hotel-notes" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Notas</label>
                <textarea
                  id="edit-hotel-notes" name="notes" rows={2}
                  maxLength={1000}
                  defaultValue={hotel.notes ?? ""}
                  placeholder="Notas adicionales (opcional)"
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="reserved"
                  defaultChecked={hotel.reserved}
                  className="h-4 w-4 rounded border-zinc-300 accent-zinc-900 dark:accent-zinc-100"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Marcar como reservado</span>
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button" onClick={() => setOpen(false)} disabled={loading}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={loading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
