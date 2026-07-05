import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ExcursionCard } from "@/modules/itinerary/components/excursion-card";
import { CreateExcursionForm } from "@/modules/itinerary/components/create-excursion-form";
import { ExcursionActivityRow } from "@/modules/itinerary/components/excursion-activity-row";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function ExcursionsPanel({ tripId }: { tripId: string }) {
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

  const floating = excursions.filter((e) => !e.date);
  const scheduled = excursions.filter((e) => !!e.date);

  function buildSlot(activities: typeof excursions[0]["activities"]) {
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
      />
    ));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          {floating.length > 0 && `${floating.length} sin fecha`}
          {floating.length > 0 && scheduled.length > 0 && " · "}
          {scheduled.length > 0 &&
            `${scheduled.length} programada${scheduled.length !== 1 ? "s" : ""}`}
          {excursions.length === 0 && "Sin excursiones todavía"}
        </p>
        {canEdit && <CreateExcursionForm tripId={tripId} />}
      </div>

      {excursions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-800 p-12 text-center">
          <p className="text-3xl mb-2">🗺️</p>
          <p className="text-sm font-medium text-zinc-400">Sin excursiones todavía</p>
          <p className="mt-1 text-xs text-zinc-600">
            Añade salidas de día (Kamakura, Fuji…) y asígnales fecha cuando tengas las
            entradas
          </p>
        </div>
      ) : (
        <>
          {/* Sin fecha */}
          {floating.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
                Sin fecha asignada
              </p>
              {floating.map((e) => (
                <ExcursionCard
                  key={e.id}
                  excursion={{ id: e.id, title: e.title, description: e.description, date: e.date }}
                  tripId={tripId}
                  activityCount={e.activities.length}
                  activitiesSlot={buildSlot(e.activities)}
                  canEdit={canEdit}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}

          {/* Programadas */}
          {scheduled.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
                Programadas
              </p>
              {scheduled.map((e) => (
                <ExcursionCard
                  key={e.id}
                  excursion={{ id: e.id, title: e.title, description: e.description, date: e.date }}
                  tripId={tripId}
                  activityCount={e.activities.length}
                  activitiesSlot={buildSlot(e.activities)}
                  canEdit={canEdit}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
