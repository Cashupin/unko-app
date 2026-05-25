import { prisma } from "@/lib/prisma";
import { ItineraryCalendar } from "@/modules/itinerary/components/itinerary-calendar";

export async function ItineraryCalendarServer({
  tripId,
  startDate,
  endDate,
}: {
  tripId: string;
  startDate: Date | null;
  endDate: Date | null;
}) {
  const [activities, hotels] = await Promise.all([
    prisma.activity.findMany({
      where: { tripId, activityDate: { not: null } },
      select: {
        id: true,
        title: true,
        activityDate: true,
        activityTime: true,
        description: true,
        location: true,
        notes: true,
        photoUrl: true,
        item: { select: { imageUrl: true } },
      },
      orderBy: [{ activityDate: "asc" }, { activityTime: "asc" }],
    }),
    prisma.hotel.findMany({
      where: { tripId },
      select: { id: true, name: true, city: true, checkInDate: true, checkOutDate: true },
      orderBy: { checkInDate: "asc" },
    }),
  ]);

  return (
    <ItineraryCalendar
      activities={activities.map((a) => ({
        id: a.id,
        title: a.title,
        activityDate: a.activityDate!.toISOString().slice(0, 10),
        activityTime: a.activityTime,
        description: a.description,
        location: a.location,
        notes: a.notes,
        photoUrl: a.photoUrl,
        itemImageUrl: a.item?.imageUrl ?? null,
      }))}
      hotels={hotels.map((h) => ({
        id: h.id,
        name: h.name,
        city: h.city,
        checkInDate: h.checkInDate.toISOString().slice(0, 10),
        checkOutDate: h.checkOutDate.toISOString().slice(0, 10),
      }))}
      startDate={startDate ? startDate.toISOString().slice(0, 10) : null}
      endDate={endDate ? endDate.toISOString().slice(0, 10) : null}
    />
  );
}
