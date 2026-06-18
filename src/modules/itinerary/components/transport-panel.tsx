import { prisma } from "@/lib/prisma";
import { fmtAmount } from "@/lib/constants";
import { TransportPanelClient } from "@/modules/itinerary/components/transport-panel-client";

export async function TransportPanel({
  tripId,
  canEdit,
  defaultCurrency,
  tripStartDate,
  tripEndDate,
}: {
  tripId: string;
  canEdit: boolean;
  defaultCurrency: string;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
}) {
  const [passes, transports] = await Promise.all([
    prisma.pass.findMany({
      where: { tripId },
      select: {
        id: true, name: true,
        validFrom: true, validTo: true,
        cost: true, currency: true, isPaid: true, notes: true,
        transports: { select: { id: true } },
      },
      orderBy: { validFrom: "asc" },
    }),
    prisma.transport.findMany({
      where: { tripId },
      select: {
        id: true, origin: true, destination: true, type: true,
        departureDate: true, departureTime: true,
        arrivalDate: true, arrivalTime: true,
        cost: true, currency: true, isPaid: true, notes: true,
        coveredByPassId: true,
        coveredByPass: { select: { id: true, name: true } },
      },
      orderBy: [{ departureDate: "asc" }, { departureTime: "asc" }],
    }),
  ]);

  // Compute pending total (transports with cost not covered by pass and not paid)
  const pendingTotal = new Map<string, number>();
  for (const t of transports) {
    if (t.coveredByPassId || t.isPaid || !t.cost) continue;
    pendingTotal.set(t.currency, (pendingTotal.get(t.currency) ?? 0) + t.cost);
  }
  // Passes pending (not paid, with cost)
  for (const p of passes) {
    if (p.isPaid || !p.cost) continue;
    pendingTotal.set(p.currency, (pendingTotal.get(p.currency) ?? 0) + p.cost);
  }

  const pendingLines = [...pendingTotal.entries()].map(
    ([currency, amount]) => fmtAmount(amount, currency)
  );

  return (
    <TransportPanelClient
      tripId={tripId}
      canEdit={canEdit}
      defaultCurrency={defaultCurrency}
      tripStartDate={tripStartDate ?? undefined}
      tripEndDate={tripEndDate ?? undefined}
      passes={passes.map((p) => ({
        ...p,
        validFrom: p.validFrom?.toISOString() ?? null,
        validTo: p.validTo?.toISOString() ?? null,
        transportCount: p.transports.length,
      }))}
      transports={transports.map((t) => ({
        ...t,
        departureDate: t.departureDate?.toISOString() ?? null,
        arrivalDate: t.arrivalDate?.toISOString() ?? null,
      }))}
      pendingLines={pendingLines}
    />
  );
}
