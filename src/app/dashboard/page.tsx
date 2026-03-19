import Link from "next/link";
import { auth, signOut } from "@/auth";
import { CURRENCY_SYMBOLS as SYM, fmtAmount } from "@/lib/constants";
import type { Currency } from "@/lib/constants";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calculateSettlement } from "@/lib/settlement";
import { InviteUserForm } from "@/components/invite-user-form";
import { UserMenu } from "@/components/user-menu";
import { DashboardMobileMenu } from "@/components/dashboard-mobile-menu";
import { NotificationsBell } from "@/components/notifications-bell";
import { TutorialButton } from "@/components/tutorial-button";
import { StandaloneExpenseForm } from "@/components/standalone-expense-form";
import { DashboardExpenses } from "@/components/dashboard-expenses";
import type { TripSummary } from "@/types/trip";
import type { StandaloneExpenseData } from "@/components/standalone-expense-card";

const CURRENCY_SYMBOLS: Record<string, string> = {
  CLP: "$", JPY: "¥", USD: "$", EUR: "€", GBP: "£", KRW: "₩", CNY: "¥", THB: "฿",
};

// Gradient + emoji palette for trip cards, selected by trip id hash
const TRIP_PALETTES = [
  { gradient: "from-[#1a1a2e] via-[#16213e] to-[#0f3460]", emoji: "✈️" },
  { gradient: "from-[#1c1917] via-[#292524] to-[#44403c]", emoji: "🏔️" },
  { gradient: "from-[#052e16] via-[#14532d] to-[#166534]", emoji: "🌿" },
  { gradient: "from-[#1e1b4b] via-[#312e81] to-[#4338ca]", emoji: "🌊" },
  { gradient: "from-[#27272a] via-[#3f3f46] to-[#52525b]", emoji: "🗺️" },
  { gradient: "from-[#3b0764] via-[#581c87] to-[#7c3aed]", emoji: "🏙️" },
];

function getTripPalette(id: string) {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TRIP_PALETTES[hash % TRIP_PALETTES.length];
}

async function getTripSummaries(userId: string): Promise<TripSummary[]> {
  const participations = await prisma.tripParticipant.findMany({
    where: { userId, trip: { isStandaloneGroup: false } },
    select: {
      role: true,
      trip: {
        select: {
          id: true,
          name: true,
          description: true,
          destination: true,
          startDate: true,
          endDate: true,
          defaultCurrency: true,
          coverImageUrl: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true, image: true } },
          _count: { select: { participants: true, items: true } },
        },
      },
    },
    orderBy: { trip: { createdAt: "desc" } },
  });
  return participations.map(({ role, trip }) => ({ ...trip, myRole: role }));
}

async function getStandaloneExpenses(userId: string): Promise<StandaloneExpenseData[]> {
  const rawExpenses = await prisma.expense.findMany({
    where: { trip: { isStandaloneGroup: true, createdById: userId } },
    select: {
      id: true,
      description: true,
      amount: true,
      currency: true,
      paymentMethod: true,
      receiptUrl: true,
      expenseDate: true,
      splitType: true,
      category: true,
      isActive: true,
      createdById: true,
      trip: { select: { id: true } },
      paidBy: { select: { id: true, name: true } },
      participants: {
        select: {
          participantId: true,
          amount: true,
          paid: true,
          participant: { select: { id: true, name: true } },
        },
      },
      items: {
        select: {
          id: true,
          description: true,
          amount: true,
          participants: {
            select: { participant: { select: { id: true, name: true } } },
          },
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { expenseDate: "desc" },
  });

  return rawExpenses.map((expense) => {
    const participants = expense.participants.map((ep) => ({
      id: ep.participant.id,
      name: ep.participant.name,
    }));
    const { settlements } = calculateSettlement(
      [
        {
          id: expense.id,
          amount: expense.amount,
          currency: expense.currency,
          paidByParticipantId: expense.paidBy?.id ?? null,
          participants: expense.participants.map((ep) => ({
            participantId: ep.participant.id,
            amount: ep.amount,
          })),
        },
      ],
      participants,
      [],
    );
    return { ...expense, settlement: settlements };
  });
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const [trips, standaloneExpenses] = await Promise.all([
    getTripSummaries(session.user.id),
    getStandaloneExpenses(session.user.id),
  ]);

  // ── Metrics ─────────────────────────────────────────────────────────────────
  const firstName = session.user.name?.split(" ")[0] ?? "ahí";

  const now = new Date();

  // Pending settlement amounts grouped by currency
  const pendingByCurrency: Record<string, number> = {};
  let pendingSettlements = 0;
  for (const exp of standaloneExpenses) {
    for (const s of exp.settlement) {
      const debtor = exp.participants.find((ep) => ep.participant.name === s.fromName);
      if (!debtor?.paid) {
        pendingByCurrency[s.currency] = (pendingByCurrency[s.currency] ?? 0) + s.amount;
        pendingSettlements++;
      }
    }
  }

  // This month expenses grouped by currency
  const thisMonthExpenses = standaloneExpenses.filter((exp) => {
    const d = new Date(exp.expenseDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthByCurrency: Record<string, number> = {};
  for (const exp of thisMonthExpenses) {
    thisMonthByCurrency[exp.currency] = (thisMonthByCurrency[exp.currency] ?? 0) + exp.amount;
  }

  // Format a currency→amount map as "$ 38.750 · ¥ 2.000" etc.
  function fmtByCurrency(map: Record<string, number>) {
    return Object.entries(map)
      .map(([c, v]) => `${SYM[c as Currency] ?? c} ${fmtAmount(v, c)}`)
      .join(" · ");
  }

  // ── Hero trip: nearest upcoming, else first ──────────────────────────────────
  const sortedByDate = [...trips].sort((a, b) => {
    const aDate = a.startDate ? new Date(a.startDate).getTime() : Infinity;
    const bDate = b.startDate ? new Date(b.startDate).getTime() : Infinity;
    return aDate - bDate;
  });
  const upcomingTrips = sortedByDate.filter(
    (t) => t.startDate && new Date(t.startDate) >= now,
  );
  const heroTrip = upcomingTrips[0] ?? trips[0] ?? null;
  const otherTrips = trips.filter((t) => t !== heroTrip);

  // Days until hero trip
  let heroCountdown: number | null = null;
  if (heroTrip?.startDate) {
    const diff = Math.ceil(
      (new Date(heroTrip.startDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff >= 0) heroCountdown = diff;
  }

  // Slots for menus
  const signOutSlot = (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/api/auth/signin" });
      }}
    >
      <button
        type="submit"
        className="w-full rounded-lg px-4 py-2.5 text-left text-sm text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-700"
      >
        Cerrar sesión
      </button>
    </form>
  );

  const inviteSlot = (
    <div className="w-full">
      <InviteUserForm />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0E1113]">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-700/80 dark:bg-zinc-900 sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 md:px-6">
          <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 tracking-tight">
            ✈ UnkoTrip
          </span>
          <div className="flex items-center gap-2">
            <TutorialButton tutorialId="dashboard" />
            <NotificationsBell />
            <div className="hidden md:flex items-center gap-2">
              <InviteUserForm />
              <UserMenu
                userName={session.user.name ?? null}
                userEmail={session.user.email ?? null}
                userImage={session.user.image ?? null}
                signOutSlot={signOutSlot}
              />
            </div>
            <DashboardMobileMenu signOutSlot={signOutSlot} inviteSlot={inviteSlot} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10 flex flex-col gap-10">

        {/* ── Greeting ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Hola, {firstName} 👋
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            {trips.length === 0 && standaloneExpenses.length === 0
              ? "¡Empieza creando tu primer viaje!"
              : trips.length > 0 && pendingSettlements > 0
              ? `Tienes ${trips.length} viaje${trips.length !== 1 ? "s" : ""} y ${pendingSettlements} liquidación${pendingSettlements !== 1 ? "es" : ""} pendiente${pendingSettlements !== 1 ? "s" : ""}.`
              : trips.length > 0
              ? `Tienes ${trips.length} viaje${trips.length !== 1 ? "s" : ""} planificado${trips.length !== 1 ? "s" : ""}.`
              : `${standaloneExpenses.length} gasto${standaloneExpenses.length !== 1 ? "s" : ""} independiente${standaloneExpenses.length !== 1 ? "s" : ""} registrado${standaloneExpenses.length !== 1 ? "s" : ""}.`}
          </p>
        </div>

        {/* ── Metrics ──────────────────────────────────────────────────── */}
        <div id="tutorial-metrics" className="grid grid-cols-3 gap-3 md:gap-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/60 px-4 py-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Viajes
            </span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{trips.length}</span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 leading-snug">
              {heroCountdown === 0
                ? "¡Hoy empieza!"
                : heroCountdown === 1
                ? "1 día para el próximo"
                : heroCountdown != null
                ? `${heroCountdown} días para el próximo`
                : trips.length === 0
                ? "Sin viajes aún"
                : "sin fecha próxima"}
            </span>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/60 px-4 py-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Por cobrar
            </span>
            <span className={`text-xl font-bold leading-tight tabular-nums ${pendingSettlements > 0 ? "text-amber-500 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100"}`}>
              {pendingSettlements > 0
                ? fmtByCurrency(pendingByCurrency) || "—"
                : "—"}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 leading-snug">
              {pendingSettlements > 0
                ? `en gastos independientes`
                : standaloneExpenses.length > 0
                ? "todo liquidado"
                : "sin gastos aún"}
            </span>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/60 px-4 py-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Gastos este mes
            </span>
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight tabular-nums">
              {thisMonthExpenses.length > 0
                ? fmtByCurrency(thisMonthByCurrency) || "—"
                : "—"}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 leading-snug">
              {thisMonthExpenses.length === 0
                ? "sin gastos este mes"
                : `en ${thisMonthExpenses.length} gasto${thisMonthExpenses.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>

        {/* ── Mis viajes ─────────────────────────────────────────────── */}
        <section id="tutorial-trips">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Mis viajes
            </h2>
            <Link
              id="tutorial-new-trip"
              href="/trips/new"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              + Nuevo viaje
            </Link>
          </div>

          {trips.length === 0 ? (
            <Link
              href="/trips/new"
              className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 p-12 text-center hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-800/40 transition-all"
            >
              <span className="text-3xl mb-3">✈️</span>
              <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                Crear primer viaje
              </p>
            </Link>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Hero trip */}
              {heroTrip && <HeroTripCard trip={heroTrip} countdown={heroCountdown} />}

              {/* Mini grid */}
              {(otherTrips.length > 0) && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {otherTrips.map((trip) => (
                    <MiniTripCard key={trip.id} trip={trip} />
                  ))}
                  <Link
                    href="/trips/new"
                    className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 p-6 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-800/30 transition-all min-h-25"
                  >
                    <span className="text-xl text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors">+</span>
                    <span className="text-xs font-semibold text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors mt-1">
                      Nuevo viaje
                    </span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Gastos independientes ─────────────────────────────────── */}
        <section id="tutorial-standalone">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Gastos independientes
              </h2>
              <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                Liquidación individual por gasto
              </p>
            </div>
            <StandaloneExpenseForm />
          </div>
          <DashboardExpenses expenses={standaloneExpenses} />
        </section>

      </main>
    </div>
  );
}

// ─── Hero Trip Card ────────────────────────────────────────────────────────────

function HeroTripCard({ trip, countdown }: { trip: TripSummary; countdown: number | null }) {
  const palette = getTripPalette(trip.id);

  const fmt = (d: Date | string) =>
    new Date(d).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });

  const start = trip.startDate ? fmt(trip.startDate) : null;
  const end = trip.endDate ? fmt(trip.endDate) : null;

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group relative flex flex-col justify-end rounded-2xl overflow-hidden min-h-50 transition-all hover:scale-[1.01] hover:shadow-2xl"
    >
      {/* Background: photo or gradient */}
      {trip.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trip.coverImageUrl}
          alt={trip.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className={`absolute inset-0 bg-linear-to-br ${palette.gradient}`} />
      )}

      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />

      {/* Large emoji decoration */}
      <div className="absolute top-4 right-5 text-6xl opacity-[0.12] select-none leading-none">
        {palette.emoji}
      </div>

      {/* Top badges */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        {countdown !== null && (
          <span className="rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-white/80">
            {countdown === 0 ? "¡Hoy!" : `${countdown}d`}
          </span>
        )}
        <span className="rounded-full border border-white/15 bg-black/20 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-white/70">
          {trip.myRole === "ADMIN" ? "Admin" : trip.myRole === "EDITOR" ? "Editor" : "Invitado"}
        </span>
      </div>

      {/* Content */}
      <div className="relative px-5 pb-5 pt-14">
        {trip.destination && (
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50 mb-1 flex items-center gap-1">
            📍 {trip.destination}
          </p>
        )}
        <h3 className="text-2xl font-bold text-white mb-1 leading-tight">{trip.name}</h3>
        {(start || end || trip.description) && (
          <p className="text-xs text-white/50 mb-4 line-clamp-1">
            {trip.description ?? (start && end ? `${start} – ${end}` : start ?? end)}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-[12px] text-white/50 flex items-center gap-1">
              👥 {trip._count.participants}
            </span>
            <span className="text-[12px] text-white/50 flex items-center gap-1">
              💡 {trip._count.items}
            </span>
            <span className="text-[10px] font-bold text-white/40 bg-white/10 rounded-md px-1.5 py-0.5">
              {CURRENCY_SYMBOLS[trip.defaultCurrency] != null ? trip.defaultCurrency : trip.defaultCurrency}
            </span>
          </div>
          <span className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-white/90 group-hover:bg-white/20 transition-colors">
            Ver viaje →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Mini Trip Card ────────────────────────────────────────────────────────────

function MiniTripCard({ trip }: { trip: TripSummary }) {
  const palette = getTripPalette(trip.id);

  const fmt = (d: Date | string) =>
    new Date(d).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
  const start = trip.startDate ? fmt(trip.startDate) : null;

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group relative flex flex-col justify-end rounded-2xl overflow-hidden min-h-28 transition-all hover:scale-[1.02] hover:shadow-xl"
    >
      {trip.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trip.coverImageUrl}
          alt={trip.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className={`absolute inset-0 bg-linear-to-br ${palette.gradient}`} />
      )}
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />

      <div className="absolute top-3 right-3 text-3xl opacity-[0.15] select-none leading-none">
        {palette.emoji}
      </div>

      <div className="relative px-3.5 pb-3.5 pt-10">
        <p className="text-sm font-bold text-white leading-tight truncate">{trip.name}</p>
        <p className="text-[11px] text-white/40 mt-0.5 truncate">
          {start ?? trip.destination ?? (trip.myRole === "ADMIN" ? "Admin" : "Invitado")}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="flex -space-x-1">
            {Array.from({ length: Math.min(trip._count.participants, 3) }).map((_, i) => (
              <span
                key={i}
                className="inline-flex w-4 h-4 rounded-full border border-white/20 bg-white/20 items-center justify-center text-[8px] font-bold text-white/70"
              >
                {String.fromCharCode(65 + i)}
              </span>
            ))}
            {trip._count.participants > 3 && (
              <span className="inline-flex w-4 h-4 rounded-full border border-white/20 bg-black/30 items-center justify-center text-[8px] font-bold text-white/60">
                +{trip._count.participants - 3}
              </span>
            )}
          </span>
          <span className="text-[10px] font-bold text-white/40 bg-white/10 rounded px-1 py-0.5">
            {trip.defaultCurrency}
          </span>
        </div>
      </div>
    </Link>
  );
}
