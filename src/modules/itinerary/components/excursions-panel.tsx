import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ExcursionCard } from "@/modules/itinerary/components/excursion-card";
import { ExcursionActivityRow } from "@/modules/itinerary/components/excursion-activity-row";
import { ExcursionSectionsClient } from "@/modules/itinerary/components/excursion-sections-client";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function ExcursionsPanel({
  tripId,
  tripStartDate,
  tripEndDate,
}: {
  tripId: string;
  tripStartDate?: string;
  tripEndDate?: string;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const [excursions, myParticipant] = await Promise.all([
    prisma.excursion.findMany({
      where: { tripId },
      include: {
        activities: {
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            locationLat: true,
            locationLng: true,
            activityDate: true,
            activityTime: true,
            notes: true,
            photoUrl: true,
            isDraft: true,
            item: {
              select: { id: true, title: true, imageUrl: true, address: true },
            },
            tickets: { select: { id: true, isPurchased: true } },
          },
          orderBy: [{ activityTime: "asc" }],
        },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.tripParticipant.findFirst({
      where: { tripId, userId: session.user.id },
      select: { role: true },
    }),
  ]);

  const role = myParticipant?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";
  const isAdmin = role === "ADMIN";

  // Categorías únicas existentes (para alimentar el selector del form)
  const existingCategories = [
    ...new Set(
      excursions.map((e) => e.category).filter((c): c is string => !!c)
    ),
  ].sort();

  // Agrupar excursiones por categoría — categorías nombradas primero (orden alfabético), sin categoría al final
  const categoryMap = new Map<string | null, typeof excursions>();

  for (const e of excursions) {
    const cat = e.category || null;
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(e);
  }

  const sortedCategoryKeys: (string | null)[] = [
    ...existingCategories, // ya están ordenadas
    ...(categoryMap.has(null) ? [null] : []),
  ];

  // Totales para el contador del toolbar
  const totalSinFecha = excursions.filter((e) => !e.date).length;
  const totalScheduled = excursions.filter((e) => !!e.date).length;

  function buildActivitiesSlot(activities: typeof excursions[0]["activities"]) {
    return activities.map((a) => (
      <ExcursionActivityRow
        key={a.id}
        act={{
          ...a,
          activityDate: a.activityDate ? toDateStr(a.activityDate) : null,
        }}
        tripId={tripId}
        canEdit={canEdit}
        isAdmin={isAdmin}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
      />
    ));
  }

  const sections = sortedCategoryKeys.map((cat) => {
    const items = categoryMap.get(cat)!;
    return {
      name: cat,
      count: items.length,
      slot: (
        <>
          {items.map((e) => (
            <ExcursionCard
              key={e.id}
              excursion={{
                id: e.id,
                title: e.title,
                description: e.description,
                notes: e.notes,
                date: e.date,
                category: e.category,
              }}
              tripId={tripId}
              activityCount={e.activities.length}
              activitiesSlot={buildActivitiesSlot(e.activities)}
              canEdit={canEdit}
              isAdmin={isAdmin}
              existingCategories={existingCategories}
              tripStartDate={tripStartDate}
              tripEndDate={tripEndDate}
            />
          ))}
        </>
      ),
    };
  });

  return (
    <ExcursionSectionsClient
      sections={sections}
      canEdit={canEdit}
      tripId={tripId}
      existingCategories={existingCategories}
      totalSinFecha={totalSinFecha}
      totalScheduled={totalScheduled}
    />
  );
}
