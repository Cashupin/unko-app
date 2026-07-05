import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TicketCard } from "@/modules/itinerary/components/ticket-card";
import { CreateTicketForm } from "@/modules/itinerary/components/create-ticket-form";

type Participant = { id: string; name: string };

export async function TicketsPanel({
  tripId,
  defaultCurrency,
  participants,
}: {
  tripId: string;
  defaultCurrency: string;
  participants: Participant[];
}) {
  const session = await auth();
  if (!session?.user) return null;

  const [tickets, activities, myParticipant] = await Promise.all([
    prisma.ticket.findMany({
      where: { tripId },
      include: {
        activity: { select: { id: true, title: true, activityDate: true } },
        purchasedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ isPurchased: "asc" }, { buyDeadline: "asc" }, { createdAt: "asc" }],
    }),
    prisma.activity.findMany({
      where: { tripId, isDraft: false },
      select: { id: true, title: true, activityDate: true },
      orderBy: [{ activityDate: "asc" }, { activityTime: "asc" }],
    }),
    prisma.tripParticipant.findFirst({
      where: { tripId, userId: session.user.id },
      select: { role: true },
    }),
  ]);

  const isAdmin = myParticipant?.role === "ADMIN";

  const activitiesForForm = activities.map((a) => ({
    id: a.id,
    title: a.title,
    activityDate: a.activityDate ? a.activityDate.toISOString().slice(0, 10) : null,
  }));

  const ticketsMapped = tickets.map((t) => ({
    ...t,
    price: t.price ? Number(t.price) : null,
    currency: t.currency as string,
    scope: t.scope as "GROUP" | "INDIVIDUAL",
    activity: t.activity
      ? {
          ...t.activity,
          activityDate: t.activity.activityDate ? t.activity.activityDate.toISOString().slice(0, 10) : null,
        }
      : null,
  }));

  const pending = ticketsMapped.filter((t) => !t.isPurchased);
  const purchased = ticketsMapped.filter((t) => t.isPurchased);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">
            {pending.length} pendiente{pending.length !== 1 ? "s" : ""}
            {purchased.length > 0 && ` · ${purchased.length} comprada${purchased.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <CreateTicketForm
          tripId={tripId}
          defaultCurrency={defaultCurrency}
          activities={activitiesForForm}
        />
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-800 p-12 text-center">
          <p className="text-2xl mb-2">🎟️</p>
          <p className="text-sm font-medium text-zinc-400">Sin entradas todavía</p>
          <p className="mt-1 text-xs text-zinc-600">Añade entradas que necesiten reserva anticipada</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="flex flex-col gap-3">
              {pending.map((t) => (
                <TicketCard key={t.id} ticket={t} tripId={tripId} participants={participants} isAdmin={isAdmin} />
              ))}
            </div>
          )}
          {purchased.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Compradas</p>
              {purchased.map((t) => (
                <TicketCard key={t.id} ticket={t} tripId={tripId} participants={participants} isAdmin={isAdmin} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
