import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calculateSettlement } from "@/lib/settlement";
import { InviteUserForm } from "@/components/invite-user-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { CurrencySelector } from "@/components/currency-selector";
import { DashboardMobileMenu } from "@/components/dashboard-mobile-menu";
import { StandaloneExpenseForm } from "@/components/standalone-expense-form";
import { StandaloneExpenseCard } from "@/components/standalone-expense-card";
import type { TripSummary } from "@/types/trip";
import type { StandaloneExpenseData } from "@/components/standalone-expense-card";

const ROLE_LABELS = { ADMIN: "Admin", EDITOR: "Editor", VIEWER: "Invitado" } as const;
const CURRENCY_SYMBOLS: Record<string, string> = {
  CLP: "CLP", JPY: "¥", USD: "$", EUR: "€", GBP: "£", KRW: "₩", CNY: "¥", THB: "฿",
};

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
    <div className="min-h-screen bg-white dark:bg-[#0E1113]">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Planificador de viaje
          </h1>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{session.user.email}</span>
            <InviteUserForm />
            <CurrencySelector />
            <ThemeToggle />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/api/auth/signin" });
              }}
            >
              <button
                type="submit"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
              >
                Salir
              </button>
            </form>
          </div>

          <DashboardMobileMenu signOutSlot={signOutSlot} inviteSlot={inviteSlot} />
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8 flex flex-col gap-10">

        {/* ── Mis viajes ─────────────────────────────────────────────────── */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Mis viajes</h2>
            <Link
              href="/trips/new"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              + Nuevo viaje
            </Link>
          </div>

          {trips.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 p-14 text-center dark:border-zinc-700">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                No tienes viajes todavía.{" "}
                <Link
                  href="/trips/new"
                  className="text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
                >
                  Crea el primero
                </Link>
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </section>

        {/* ── Gastos independientes ──────────────────────────────────────── */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Gastos independientes
              </h2>
              <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                Gastos sin viaje — liquidación individual por gasto
              </p>
            </div>
            <StandaloneExpenseForm />
          </div>

          {standaloneExpenses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                Sin gastos independientes aún.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {standaloneExpenses.map((expense) => (
                <StandaloneExpenseCard key={expense.id} expense={expense} />
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

function TripCard({ trip }: { trip: TripSummary }) {
  const fmt = (d: Date | string) =>
    new Date(d).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const start = trip.startDate ? fmt(trip.startDate) : null;
  const end = trip.endDate ? fmt(trip.endDate) : null;

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group flex flex-col rounded-2xl border border-zinc-100 bg-white shadow-sm ring-1 ring-black/3 hover:shadow-lg hover:border-zinc-200 transition-all overflow-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:ring-white/5 dark:hover:border-zinc-700"
    >
      <div className="h-1.5 w-full bg-linear-to-r from-zinc-300 via-zinc-200 to-zinc-100 dark:from-zinc-700 dark:via-zinc-600 dark:to-zinc-800" />

      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-zinc-900 group-hover:text-zinc-700 transition-colors dark:text-zinc-100 dark:group-hover:text-zinc-300">
            {trip.name}
          </h3>
          <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-400">
            {ROLE_LABELS[trip.myRole]}
          </span>
        </div>

        {trip.destination && (
          <p className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <span>📍</span>
            <span>{trip.destination}</span>
          </p>
        )}

        {(start || end) && (
          <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
            🗓 {start && end ? `${start} – ${end}` : (start ?? end)}
          </p>
        )}

        {trip.description && (
          <p className="line-clamp-2 text-sm text-zinc-500 leading-relaxed dark:text-zinc-400">
            {trip.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-700">
          <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
            <span>
              👥 {trip._count.participants}{" "}
              {trip._count.participants !== 1 ? "personas" : "persona"}
            </span>
            <span>
              💡 {trip._count.items}{" "}
              {trip._count.items !== 1 ? "propuestas" : "propuesta"}
            </span>
          </div>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
            {CURRENCY_SYMBOLS[trip.defaultCurrency] ?? trip.defaultCurrency}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {trip.createdBy.image && (
            <Image
              src={trip.createdBy.image}
              alt={trip.createdBy.name ?? ""}
              width={18}
              height={18}
              className="rounded-full ring-1 ring-zinc-200 dark:ring-zinc-700"
            />
          )}
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            Creado por{" "}
            <span className="font-medium text-zinc-500 dark:text-zinc-400">
              {trip.createdBy.name ?? "—"}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
