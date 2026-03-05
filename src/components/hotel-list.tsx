import { prisma } from "@/lib/prisma";
import { DeleteHotelButton } from "@/components/delete-hotel-button";
import { EditHotelForm } from "@/components/edit-hotel-form";
import { HotelReservedToggle } from "@/components/hotel-reserved-toggle";
import { HotelScrollTarget } from "@/components/hotel-scroll-target";
import { HotelSummaryPanel } from "@/components/hotel-summary-panel";
import { ConvertedAmount } from "@/components/converted-amount";

export async function HotelList({
  tripId,
  canEdit,
  tripStartDate,
  tripEndDate,
  highlightHotelId,
}: {
  tripId: string;
  canEdit: boolean;
  tripStartDate?: Date | null;
  tripEndDate?: Date | null;
  highlightHotelId?: string | null;
}) {
  const [hotels, participantCount] = await Promise.all([
    prisma.hotel.findMany({
      where: { tripId },
      select: {
        id: true,
        name: true,
        link: true,
        checkInDate: true,
        checkOutDate: true,
        pricePerNight: true,
        totalPrice: true,
        numberOfNights: true,
        currency: true,
        address: true,
        notes: true,
        reserved: true,
      },
      orderBy: { checkInDate: "asc" },
    }),
    prisma.tripParticipant.count({ where: { tripId } }),
  ]);

  if (hotels.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white/60 p-14 text-center dark:border-zinc-700 dark:bg-zinc-800/60">
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          No hay alojamientos todavía. ¡Agrega el primero!
        </p>
      </div>
    );
  }

  // Parse UTC date string to avoid timezone offset shifting the day
  const fmtDate = (d: Date) => {
    const [y, m, day] = new Date(d).toISOString().slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <HotelSummaryPanel
        hotels={hotels.map((h) => ({
          pricePerNight: h.pricePerNight,
          totalPrice: h.totalPrice,
          numberOfNights: h.numberOfNights,
          currency: h.currency,
        }))}
        participantCount={participantCount}
      />
      {hotels.map((hotel) => {
        const pricePerPerson =
          hotel.totalPrice != null && participantCount > 0
            ? hotel.totalPrice / participantCount
            : null;
        return (
          <HotelScrollTarget key={hotel.id} hotelId={hotel.id} highlightId={highlightHotelId ?? null}>
          <div
            className="group rounded-2xl border border-zinc-100 bg-white shadow-sm ring-1 ring-black/3 hover:shadow-md hover:border-zinc-200 transition-all overflow-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:ring-white/5 dark:hover:border-zinc-700"
          >
            {/* Card header strip */}
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg dark:bg-blue-950">
                  🏨
                </div>
                <div className="min-w-0">
                  {hotel.link ? (
                    <a
                      href={hotel.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-semibold text-zinc-900 hover:underline underline-offset-2 leading-snug dark:text-zinc-100"
                    >
                      {hotel.name}
                    </a>
                  ) : (
                    <p className="font-semibold text-zinc-900 leading-snug dark:text-zinc-100">
                      {hotel.name}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-400">
                      {hotel.numberOfNights} noche{hotel.numberOfNights !== 1 ? "s" : ""}
                    </span>
                    <HotelReservedToggle
                      tripId={tripId}
                      hotelId={hotel.id}
                      reserved={hotel.reserved}
                    />
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <EditHotelForm
                    tripId={tripId}
                    hotel={hotel}
                    tripStartDate={tripStartDate}
                    tripEndDate={tripEndDate}
                  />
                  <DeleteHotelButton tripId={tripId} hotelId={hotel.id} />
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-zinc-100 dark:bg-zinc-700" />

            {/* Dates + pricing */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              {/* Date range */}
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-1.5 text-center dark:bg-zinc-700 dark:border-zinc-700">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Check-in
                  </p>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {fmtDate(hotel.checkInDate)}
                  </p>
                </div>
                <span className="text-zinc-300 text-lg dark:text-zinc-600">→</span>
                <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-1.5 text-center dark:bg-zinc-700 dark:border-zinc-700">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Check-out
                  </p>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {fmtDate(hotel.checkOutDate)}
                  </p>
                </div>
              </div>

              {/* Pricing */}
              {(hotel.pricePerNight != null || hotel.totalPrice != null) && (
                <div className="flex items-center gap-4 text-sm">
                  {hotel.pricePerNight != null && (
                    <div className="text-right">
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">Por noche</p>
                      <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                        <ConvertedAmount amount={hotel.pricePerNight} currency={hotel.currency} />
                      </p>
                    </div>
                  )}
                  {hotel.totalPrice != null && (
                    <div className="rounded-xl bg-zinc-900 px-3 py-1.5 text-right dark:bg-zinc-100">
                      <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-600">Total</p>
                      <p className="text-sm font-bold text-white dark:text-zinc-900">
                        <ConvertedAmount amount={hotel.totalPrice} currency={hotel.currency} />
                      </p>
                    </div>
                  )}
                  {pricePerPerson != null && (
                    <div className="text-right">
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">Por persona</p>
                      <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                        <ConvertedAmount amount={pricePerPerson} currency={hotel.currency} />
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {(hotel.notes || hotel.address) && (
              <div className="px-5 pb-4 flex flex-col gap-0.5">
                {hotel.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-500 hover:text-blue-500 hover:underline underline-offset-2 transition-colors dark:text-zinc-400 dark:hover:text-blue-400"
                  >
                    📍 {hotel.address}
                  </a>
                )}
                {hotel.notes && (
                  <p className="text-xs text-zinc-400 italic dark:text-zinc-500">{hotel.notes}</p>
                )}
              </div>
            )}
          </div>
          </HotelScrollTarget>
        );
      })}
    </div>
  );
}
