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

  // Compute pending total per currency, with a breakdown of which pass/leg contributes
  const pendingByCurrency = new Map<string, { amount: number; items: { label: string; amount: number }[] }>();
  function addPending(currency: string, amount: number, label: string) {
    if (!pendingByCurrency.has(currency)) pendingByCurrency.set(currency, { amount: 0, items: [] });
    const entry = pendingByCurrency.get(currency)!;
    entry.amount += amount;
    entry.items.push({ label, amount });
  }
  for (const p of passes) {
    if (p.isPaid || !p.cost) continue;
    addPending(p.currency, p.cost, `📦 ${p.name}`);
  }
  for (const t of transports) {
    if (t.coveredByPassId || t.isPaid || !t.cost) continue;
    addPending(t.currency, t.cost, `${t.origin} → ${t.destination}`);
  }

  const pendingDetails = [...pendingByCurrency.entries()].map(([currency, { amount, items }]) => ({
    currency,
    amount,
    items,
  }));

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
      pendingDetails={pendingDetails}
    />
  );
}
