import { Suspense } from "react";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ThemeToggle } from "@/components/theme-toggle";
import { TripMobileMenu } from "@/components/trip-mobile-menu";
import { TripBottomNav } from "@/components/trip-bottom-nav";
import { AutoRefresh } from "@/components/auto-refresh";
import { GalleryView } from "@/components/gallery-view";
import { ItemList } from "@/components/item-list";
import { CreateItemForm } from "@/components/create-item-form";
import { ManageParticipantsPanel } from "@/components/manage-participants-panel";
import { EditTripForm } from "@/components/edit-trip-form";
import { ActivityList } from "@/components/activity-list";
import { CreateActivityForm } from "@/components/create-activity-form";
import { HotelList } from "@/components/hotel-list";
import { CreateHotelForm } from "@/components/create-hotel-form";
import { ExpenseList } from "@/components/expense-list";
import { CreateExpenseForm } from "@/components/create-expense-form";
import { ItemFilterChips } from "@/components/item-filter-chips";
import type { ParticipantSummary } from "@/types/trip";

// ─── Tab config ────────────────────────────────────────────────────────────────

type Tab = "propuestas" | "itinerario" | "hoteles" | "gastos" | "galería";
const TABS: { id: Tab; label: string }[] = [
  { id: "propuestas", label: "Propuestas" },
  { id: "itinerario", label: "Itinerario" },
  { id: "hoteles", label: "Alojamiento" },
  { id: "gastos", label: "Gastos" },
  { id: "galería", label: "Galería" },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function TripPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ tab?: string; itemType?: string; itemStatus?: string; search?: string; hotelId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const { tripId } = await params;
  const { tab: tabParam, itemType, itemStatus, search, hotelId } = await searchParams;
  const activeTab: Tab =
    TABS.find((t) => t.id === tabParam)?.id ?? "propuestas";

  // ── Fetch trip + verify membership ──────────────────────────────────────────
  const [trip, myParticipant] = await Promise.all([
    prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        name: true,
        description: true,
        destination: true,
        startDate: true,
        endDate: true,
        defaultCurrency: true,
        createdById: true,
      },
    }),
    prisma.tripParticipant.findFirst({
      where: { tripId, userId: session.user.id },
      select: { role: true },
    }),
  ]);

  if (!trip) notFound();
  if (!myParticipant) redirect("/dashboard"); // not a member

  const isAdmin = myParticipant.role === "ADMIN";
  const canEdit = myParticipant.role !== "VIEWER";

  // ── Participants ─────────────────────────────────────────────────────────────
  const rawParticipants = await prisma.tripParticipant.findMany({
    where: { tripId },
    select: {
      id: true,
      name: true,
      type: true,
      role: true,
      joinedAt: true,
      user: { select: { id: true, name: true, image: true, email: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
  const participants = rawParticipants as ParticipantSummary[];

  // Simplified participant list for expense/payment forms
  const participantOptions = rawParticipants.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const fmt = (d: Date | string) =>
    new Date(d).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  // Slots for mobile menu (server-rendered nodes passed as props)
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

  const editSlot = isAdmin ? <EditTripForm trip={trip} /> : null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0E1113]">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="shrink-0 flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              {/* Home icon — mobile only */}
              <svg className="sm:hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
                <path d="M9 21V12h6v9" />
              </svg>
              {/* Arrow + text — sm+ */}
              <span className="hidden sm:inline">← Mis viajes</span>
            </Link>
            <span className="text-zinc-200 dark:text-zinc-700">/</span>
            <h1 className="text-base font-semibold text-zinc-900 truncate dark:text-zinc-100">
              {trip.name}
            </h1>
            {trip.destination && (
              <span className="hidden shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 sm:inline dark:bg-zinc-700 dark:text-zinc-400">
                📍 {trip.destination}
              </span>
            )}
            {(trip.startDate || trip.endDate) && (
              <span className="hidden shrink-0 text-xs text-zinc-400 lg:inline dark:text-zinc-500">
                {trip.startDate && fmt(trip.startDate)}
                {trip.startDate && trip.endDate && " – "}
                {trip.endDate && fmt(trip.endDate)}
              </span>
            )}
          </div>

          {/* Desktop action buttons — hidden on mobile */}
          <div className="hidden md:flex shrink-0 items-center gap-2">
            {isAdmin && <EditTripForm trip={trip} />}
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

          {/* Mobile hamburger menu */}
          <TripMobileMenu
            tripId={tripId}
            activeTab={activeTab}
            tripName={trip.name}
            isAdmin={isAdmin}
            signOutSlot={signOutSlot}
            editSlot={editSlot}
          />
        </div>

        {/* Tab navigation — hidden on mobile, shown on tablet+ */}
        <div className="mx-auto max-w-5xl px-4 pb-3 md:px-6">
          <nav className="hidden md:flex gap-1" aria-label="Pestañas del viaje">
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                href={`/trips/${tripId}?tab=${tab.id}`}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 md:px-6 md:py-8 md:pb-8">

        {/* ── Propuestas ──────────────────────────────────────────────────── */}
        {activeTab === "propuestas" && (
          <div className="flex flex-col gap-6">
            {/* Participants — collapsible at the top */}
            <ManageParticipantsPanel
              tripId={tripId}
              participants={participants}
              currentUserId={session.user.id}
              isAdmin={isAdmin}
            />

            {/* Items list */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Propuestas del grupo
                </h2>
                <CreateItemForm tripId={tripId} />
              </div>

              <div className="mb-4">
                <ItemFilterChips />
              </div>

              <Suspense
                fallback={
                  <div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando propuestas...</div>
                }
              >
                <ItemList
                  currentUserId={session.user.id}
                  tripId={tripId}
                  isAdmin={isAdmin}
                  tripStartDate={trip.startDate}
                  tripEndDate={trip.endDate}
                  typeFilter={itemType}
                  statusFilter={itemStatus}
                  search={search}
                />
              </Suspense>
            </div>
          </div>
        )}

        {/* ── Itinerario ──────────────────────────────────────────────────── */}
        {activeTab === "itinerario" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Itinerario</h2>
              {/* Hidden on mobile — each day card has its own add button */}
              {canEdit && (
                <div className="hidden md:block">
                  <CreateActivityForm tripId={tripId} />
                </div>
              )}
            </div>
            <Suspense fallback={<div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando itinerario...</div>}>
              <ActivityList
                tripId={tripId}
                canEdit={canEdit}
                startDate={trip.startDate}
                endDate={trip.endDate}
              />
            </Suspense>
          </div>
        )}

        {/* ── Alojamiento ──────────────────────────────────────────────────── */}
        {activeTab === "hoteles" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Alojamiento</h2>
              {canEdit && (
                <CreateHotelForm
                  tripId={tripId}
                  defaultCurrency={trip.defaultCurrency}
                  tripStartDate={trip.startDate}
                  tripEndDate={trip.endDate}
                />
              )}
            </div>
            <Suspense fallback={<div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando alojamiento...</div>}>
              <HotelList
                tripId={tripId}
                canEdit={canEdit}
                tripStartDate={trip.startDate}
                tripEndDate={trip.endDate}
                highlightHotelId={hotelId}
              />
            </Suspense>
          </div>
        )}

        {/* ── Gastos ──────────────────────────────────────────────────────── */}
        {activeTab === "gastos" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Gastos</h2>
              {canEdit && (
                <CreateExpenseForm
                  tripId={tripId}
                  participants={participantOptions}
                  defaultCurrency={trip.defaultCurrency}
                />
              )}
            </div>
            <Suspense fallback={<div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando gastos...</div>}>
              <ExpenseList
                tripId={tripId}
                participants={participantOptions}
                defaultCurrency={trip.defaultCurrency}
                canEdit={canEdit}
              />
            </Suspense>
          </div>
        )}

        {/* ── Galería ─────────────────────────────────────────────────────── */}
        {activeTab === "galería" && (
          <Suspense fallback={<div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando galería...</div>}>
            <GalleryView tripId={tripId} tripName={trip.name} />
          </Suspense>
        )}

      </main>

      <TripBottomNav tripId={tripId} activeTab={activeTab} />
      <AutoRefresh />
    </div>
  );
}
