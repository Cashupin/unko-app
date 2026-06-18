import Link from "next/link";
import { prisma } from "@/lib/prisma";

type SubTab = "itinerario" | "alojamiento" | "transporte";

export async function ItinerarySubNav({
  tripId,
  activeSubtab,
}: {
  tripId: string;
  activeSubtab: SubTab;
}) {
  const [activityCount, hotelCount, transportCount, passCount] = await Promise.all([
    prisma.activity.count({ where: { tripId } }),
    prisma.hotel.count({ where: { tripId } }),
    prisma.transport.count({ where: { tripId } }),
    prisma.pass.count({ where: { tripId } }),
  ]);

  const tabs: { id: SubTab; label: string; icon: string; count: number }[] = [
    { id: "itinerario", label: "Itinerario", icon: "🗓️", count: activityCount },
    { id: "alojamiento", label: "Alojamiento", icon: "🏨", count: hotelCount },
    { id: "transporte", label: "Transporte", icon: "🚌", count: transportCount + passCount },
  ];

  return (
    <nav className="flex border-b border-zinc-800 mb-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`/trips/${tripId}?tab=itinerario&subtab=${tab.id}`}
          className={`flex items-center gap-2 whitespace-nowrap px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeSubtab === tab.id
              ? "border-zinc-100 text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
          style={{ marginBottom: "-2px" }}
        >
          <span>{tab.icon}</span>
          {tab.label}
          {tab.count > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeSubtab === tab.id
                  ? "bg-zinc-700 text-zinc-300"
                  : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {tab.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
