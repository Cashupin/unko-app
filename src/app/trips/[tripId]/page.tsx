import { Suspense } from "react";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TripMobileMenu } from "@/modules/trips/components/trip-mobile-menu";
import { TripHeaderMenu } from "@/modules/trips/components/trip-header-menu";
import { UserMenu } from "@/components/ui/user-menu";
import { NotificationsBell } from "@/modules/notifications/components/notifications-bell";
import { TutorialButton } from "@/components/ui/tutorial-button";
import { TripBottomNav } from "@/modules/trips/components/trip-bottom-nav";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { GalleryView } from "@/modules/gallery/components/gallery-view";
import { ItemList } from "@/components/item-list";
import { CreateItemForm } from "@/components/create-item-form";
import { ManageParticipantsPanel } from "@/modules/trips/components/manage-participants-panel";
import { EditTripForm } from "@/modules/trips/components/edit-trip-form";
import { DeleteTripButton } from "@/modules/trips/components/delete-trip-button";
import { ActivityList } from "@/components/activity-list";
import { CreateActivityForm } from "@/components/create-activity-form";
import { HotelList } from "@/components/hotel-list";
import { HotelCollapsible } from "@/components/hotel-collapsible";
import { CreateHotelForm } from "@/components/create-hotel-form";
import { TripHome } from "@/modules/trips/components/trip-home";
import { ExpenseList } from "@/modules/expenses/components/expense-list";
import { CreateExpenseForm } from "@/modules/expenses/components/create-expense-form";
import { ItemFilterChips } from "@/components/item-filter-chips";
import { NearbyActivitiesServer } from "@/components/nearby-activities-server";
import { HashHighlight } from "@/components/hash-highlight";
import { KmlImport } from "@/components/kml-import";
import type { ParticipantSummary } from "@/modules/trips/types/trip";

// ─── Tab config ────────────────────────────────────────────────────────────────

type Tab = "home" | "actividades" | "itinerario" | "gastos" | "galería";
const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Inicio" },
  { id: "actividades", label: "Actividades" },
  { id: "itinerario", label: "Itinerario" },
  { id: "gastos", label: "Gastos" },
  { id: "galería", label: "Galería" },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function TripPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ tab?: string; itemType?: string; search?: string; hotelId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const { tripId } = await params;
  const { tab: tabParam, itemType, search, hotelId } = await searchParams;
  const activeTab: Tab =
    TABS.find((t) => t.id === tabParam)?.id ?? "home";

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
        coverImageUrl: true,
        createdById: true,
      },
    }),
    prisma.tripParticipant.findFirst({
      where: { tripId, userId: session.user.id },
      select: { role: true, id: true },
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

  // Extended participant list for trip home chips
  const participantsWithRoles = rawParticipants.map((p) => ({
    id: p.id,
    name: p.name,
    image: p.user?.image ?? null,
    role: p.role,
  }));

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

  const editSlot = isAdmin ? <EditTripForm trip={trip} variant="menu" /> : null;
  const deleteSlot = isAdmin ? <DeleteTripButton tripId={tripId} tripName={trip.name} /> : null;
  const manageParticipantsSlot = isAdmin ? (
    <ManageParticipantsPanel
      tripId={tripId}
      participants={participants}
      currentUserId={session.user.id}
      isAdmin={isAdmin}
    />
  ) : null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0E1113]">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-700/80 dark:bg-zinc-900 sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="shrink-0 flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              <svg className="sm:hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
                <path d="M9 21V12h6v9" />
              </svg>
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
          </div>

          {/* Right side: bell + desktop menus + mobile hamburger */}
          <div className="flex items-center gap-1">
            <TutorialButton
              tutorialId={
                activeTab === "actividades" ? "trip-actividades"
                : activeTab === "itinerario" ? "trip-itinerario"
                : activeTab === "gastos" ? "trip-gastos"
                : "trip-home"
              }
            />
            <NotificationsBell />
            <div className="hidden md:flex items-center gap-1">
              {isAdmin && (
                <div id="tutorial-trip-admin-menu">
                <TripHeaderMenu editSlot={editSlot} deleteSlot={deleteSlot} manageParticipantsSlot={manageParticipantsSlot} />
                </div>
              )}
              <UserMenu
                userName={session.user.name ?? null}
                userEmail={session.user.email ?? null}
                userImage={session.user.image ?? null}
                signOutSlot={signOutSlot}
              />
            </div>
            <TripMobileMenu
              tripId={tripId}
              activeTab={activeTab}
              tripName={trip.name}
              isAdmin={isAdmin}
              signOutSlot={signOutSlot}
              editSlot={editSlot}
              deleteSlot={deleteSlot}
              manageParticipantsSlot={manageParticipantsSlot}
            />
          </div>
        </div>

        {/* Tab navigation — hidden on mobile, shown on tablet+ */}
        <div className="mx-auto max-w-5xl px-4 pb-3 md:px-6">
          <nav id="tutorial-trip-tabs" className="hidden md:flex gap-1" aria-label="Pestañas del viaje">
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                id={`tutorial-tab-${tab.id}`}
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

        {/* ── Home ──────────────────────────────────────────────────────── */}
        {activeTab === "home" && (
          <Suspense fallback={<div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando...</div>}>
            <TripHome
              tripId={tripId}
              tripName={trip.name}
              tripDestination={trip.destination}
              coverImageUrl={trip.coverImageUrl}
              tripStartDate={trip.startDate}
              tripEndDate={trip.endDate}
              myParticipantId={myParticipant.id}
              participants={participantOptions}
              participantsWithRoles={participantsWithRoles}
              defaultCurrency={trip.defaultCurrency}
            />
          </Suspense>
        )}

        {/* ── Actividades ──────────────────────────────────────────────────── */}
        {activeTab === "actividades" && (
          <div className="flex flex-col gap-6">
            <HashHighlight />
            {/* Nearby activities */}
            <div id="tutorial-nearby">
              <Suspense fallback={null}>
                <NearbyActivitiesServer tripId={tripId} alwaysOpen expandable />
              </Suspense>
            </div>

            {/* Items list */}
            <div id="tutorial-item-list">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Actividades del grupo
                </h2>
                <div className="flex items-center gap-2">
                  {isAdmin && <KmlImport tripId={tripId} />}
                  <CreateItemForm tripId={tripId} />
                </div>
              </div>

              <div id="tutorial-item-filters" className="mb-4">
                <ItemFilterChips />
              </div>

              <Suspense
                fallback={
                  <div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando actividades...</div>
                }
              >
                <ItemList
                  currentUserId={session.user.id}
                  tripId={tripId}
                  isAdmin={isAdmin}
                  tripStartDate={trip.startDate}
                  tripEndDate={trip.endDate}
                  typeFilter={itemType}
                  search={search}
                />
              </Suspense>
            </div>
          </div>
        )}

        {/* ── Itinerario ──────────────────────────────────────────────────── */}
        {activeTab === "itinerario" && (
          <div>
            {/* Alojamiento collapsible */}
            <div id="tutorial-hotel-section">
              <HotelCollapsible
                autoOpen={!!hotelId}
                createSlot={
                  canEdit ? (
                    <CreateHotelForm
                      tripId={tripId}
                      defaultCurrency={trip.defaultCurrency}
                      tripStartDate={trip.startDate}
                      tripEndDate={trip.endDate}
                    />
                  ) : null
                }
                hotelListSlot={
                  <Suspense fallback={<div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando alojamiento...</div>}>
                    <HotelList
                      tripId={tripId}
                      canEdit={canEdit}
                      tripStartDate={trip.startDate}
                      tripEndDate={trip.endDate}
                      highlightHotelId={hotelId}
                    />
                  </Suspense>
                }
              />
            </div>

            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Itinerario</h2>
              {canEdit && (
                <div className="hidden md:block">
                  <CreateActivityForm tripId={tripId} />
                </div>
              )}
            </div>
            <div id="tutorial-activity-list">
              <Suspense fallback={<div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando itinerario...</div>}>
                <ActivityList
                  tripId={tripId}
                  canEdit={canEdit}
                  startDate={trip.startDate}
                  endDate={trip.endDate}
                />
              </Suspense>
            </div>
          </div>
        )}


        {/* ── Gastos ──────────────────────────────────────────────────────── */}
        {activeTab === "gastos" && (
          <div id="tutorial-expense-list">
            <Suspense fallback={<div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando gastos...</div>}>
            <ExpenseList
              tripId={tripId}
              participants={participantOptions}
              defaultCurrency={trip.defaultCurrency}
              canEdit={canEdit}
              myParticipantId={myParticipant.id}
              myUserId={session.user.id!}
              isAdmin={isAdmin}
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
