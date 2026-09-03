import { Suspense } from "react";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TripHeaderMenu } from "@/modules/trips/components/trip-header-menu";
import { UserMenu } from "@/components/ui/user-menu";
import { NotificationsBell } from "@/modules/notifications/components/notifications-bell";
import { TutorialButton } from "@/components/ui/tutorial-button";
import { TripMobileNav } from "@/modules/trips/components/trip-mobile-nav";
import { TripLiveUpdater } from "@/modules/trips/components/trip-live-updater";
import { GalleryView } from "@/modules/gallery/components/gallery-view";
import { ItemList } from "@/modules/proposals/components/item-list";
import { ItemsMapServer } from "@/modules/proposals/components/items-map-server";
import { CreateItemForm } from "@/modules/proposals/components/create-item-form";
import { ManageParticipantsPanel } from "@/modules/trips/components/manage-participants-panel";
import { EditTripForm } from "@/modules/trips/components/edit-trip-form";
import { DeleteTripButton } from "@/modules/trips/components/delete-trip-button";
import { ActivityList } from "@/modules/itinerary/components/activity-list";
import { ItineraryCalendarServer } from "@/modules/itinerary/components/itinerary-calendar-server";
import { ItineraryViewToggle } from "@/modules/itinerary/components/itinerary-view-toggle";
import { HotelList } from "@/modules/itinerary/components/hotel-list";
import { HotelCollapsible } from "@/modules/itinerary/components/hotel-collapsible";
import { CreateHotelForm } from "@/modules/itinerary/components/create-hotel-form";
import { ItinerarySubNav } from "@/modules/itinerary/components/itinerary-sub-nav";
import { PersonalModeProvider, PersonalModeToggle, SmartCreateButton } from "@/modules/itinerary/components/personal-mode-provider";
import { PdfExportButton } from "@/modules/itinerary/components/pdf-export-button";
import { DayCollapseProvider, CollapseAllButton } from "@/modules/itinerary/components/day-collapse-provider";
import { TransportPanel } from "@/modules/itinerary/components/transport-panel";
import { TicketsPanel } from "@/modules/itinerary/components/tickets-panel";
import { ExcursionsPanel } from "@/modules/itinerary/components/excursions-panel";
import { TripHome } from "@/modules/trips/components/trip-home";
import { ExpenseList } from "@/modules/expenses/components/expense-list";
import { ItemFilterChipsServer } from "@/modules/proposals/components/item-filter-chips-server";
import { NearbyActivitiesServer } from "@/modules/proposals/components/nearby-activities-server";
import { HashHighlight } from "@/modules/proposals/components/hash-highlight";
import { KmlImport } from "@/modules/proposals/components/kml-import";
import { ChecklistPanel } from "@/modules/checklist/components/checklist-panel";
import { ListsView } from "@/modules/lists/components/lists-view";
import { WishlistView } from "@/modules/wishlist/components/wishlist-view";
import { ItineraryTabDropdown } from "@/modules/trips/components/itinerary-tab-dropdown";
import type { ParticipantSummary } from "@/modules/trips/types/trip";

// ─── Tab config ────────────────────────────────────────────────────────────────

type Tab = "home" | "propuestas" | "itinerario" | "checklist" | "gastos" | "listas" | "galería" | "wishlist";

function TabIcon({ id, size = 14 }: { id: Tab; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (id) {
    case "home":       return <svg {...p}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>;
    case "propuestas": return <svg {...p}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26A7 7 0 0 1 5 9a7 7 0 0 1 7-7z"/></svg>;
    case "itinerario": return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case "gastos":     return <svg {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    case "checklist":  return <svg {...p}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
    case "listas":     return <svg {...p}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1.5" fill="white" stroke="none"/><circle cx="3" cy="12" r="1.5" fill="white" stroke="none"/><circle cx="3" cy="18" r="1.5" fill="white" stroke="none"/></svg>;
    case "galería":    return <svg {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
    case "wishlist":   return <svg {...p}><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M21 8H3"/><path d="M8.5 8C7.1 8 6 6.9 6 5.5S7.1 3 8.5 3c2.1 0 3.5 5 3.5 5s-1.4 0-3.5 0z"/><path d="M15.5 8C16.9 8 18 6.9 18 5.5S16.9 3 15.5 3C13.4 3 12 8 12 8s1.4 0 3.5 0z"/></svg>;
  }
}

const TABS: { id: Tab; label: string; grad: string }[] = [
  { id: "home",       label: "Inicio",     grad: "from-blue-500 to-indigo-600" },
  { id: "propuestas", label: "Propuestas", grad: "from-amber-400 to-orange-500" },
  { id: "itinerario", label: "Itinerario", grad: "from-indigo-500 to-blue-700" },
  { id: "gastos",     label: "Gastos",     grad: "from-green-500 to-emerald-600" },
  { id: "checklist",  label: "Checklist",  grad: "from-teal-400 to-cyan-600" },
  { id: "listas",     label: "Listas",     grad: "from-violet-500 to-purple-600" },
  { id: "galería",    label: "Galería",    grad: "from-rose-400 to-pink-600" },
  { id: "wishlist",   label: "Wishlist",   grad: "from-orange-400 to-red-500" },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function TripPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ tab?: string; subtab?: string; itemType?: string; search?: string; hotelId?: string; proposer?: string; view?: string; city?: string; wishlistSubtab?: string; notInItinerary?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const { tripId } = await params;
  const { tab: tabParam, subtab: subtabParam, itemType, search, hotelId, proposer, view, city, wishlistSubtab, notInItinerary } = await searchParams;

  type SubTab = "itinerario" | "alojamiento" | "transporte" | "entradas" | "excursiones";
  const SUBTABS: SubTab[] = ["itinerario", "alojamiento", "transporte", "entradas", "excursiones"];
  const activeSubtab: SubTab = SUBTABS.includes(subtabParam as SubTab) ? (subtabParam as SubTab) : "itinerario";
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
  if (!myParticipant) redirect("/"); // not a member

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

  // Participant options for the proposer filter (keyed by userId)
  const proposerOptions = rawParticipants
    .filter((p) => p.user?.id)
    .map((p) => ({ id: p.user!.id, name: p.name }));

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

  const adminIconsSlot = isAdmin ? (
    <div className="flex gap-3">
      <EditTripForm trip={trip} variant="icon" />
      <ManageParticipantsPanel
        tripId={tripId}
        participants={participants}
        currentUserId={session.user.id}
        isAdmin={isAdmin}
        variant="icon"
      />
      <DeleteTripButton tripId={tripId} tripName={trip.name} variant="icon" />
    </div>
  ) : null;

  return (
    <PersonalModeProvider>
    <DayCollapseProvider>
    <div className="min-h-screen bg-white dark:bg-[#0E1113]">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-700/80 dark:bg-zinc-900 sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
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

          {/* Right side: bell + desktop menus */}
          <div className="flex items-center gap-1">
            <TutorialButton
              tutorialId={
                activeTab === "propuestas" ? "trip-actividades"
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
          </div>
        </div>

        {/* Tab navigation — hidden on mobile, shown on tablet+ */}
        <div className="mx-auto max-w-5xl px-4 pb-3 md:px-6">
          <nav id="tutorial-trip-tabs" className="hidden md:flex gap-0.5 items-center flex-wrap" aria-label="Pestañas del viaje">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              const iconEl = (
                <span className={`flex items-center justify-center rounded-md bg-linear-to-br ${tab.grad} ${active ? "opacity-100" : "opacity-80"}`}
                  style={{ width: 22, height: 22 }}>
                  <TabIcon id={tab.id} size={13} />
                </span>
              );
              if (tab.id === "itinerario") {
                return (
                  <ItineraryTabDropdown
                    key={tab.id}
                    tripId={tripId}
                    activeTab={activeTab}
                    activeSubtab={activeSubtab}
                    tabIcon={iconEl}
                  />
                );
              }
              return (
                <Link
                  key={tab.id}
                  id={`tutorial-tab-${tab.id}`}
                  href={`/trips/${tripId}?tab=${tab.id}`}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {iconEl}
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Itinerary subnav + action bar — live inside the sticky header, no pixel offsets needed */}
        {activeTab === "itinerario" && (
          <>
            <div className="border-t border-zinc-200 dark:border-zinc-700/80">
              <div className="mx-auto max-w-5xl px-4 md:px-6">
                <ItinerarySubNav tripId={tripId} activeSubtab={activeSubtab} />
              </div>
            </div>
            {activeSubtab === "itinerario" && (
              <div className="mx-auto max-w-5xl flex items-center justify-between gap-2 px-4 py-2 md:px-6">
                <ItineraryViewToggle tripId={tripId} view={view} />
                <div className="flex items-center gap-1.5">
                  <PersonalModeToggle />
                  {view !== "calendar" && <CollapseAllButton />}
                  <PdfExportButton tripId={tripId} isAdmin={isAdmin} />
                  {canEdit && (
                    <div className="hidden md:block">
                      <SmartCreateButton
                        tripId={tripId}
                        compact={false}
                        isAdmin={isAdmin}
                        tripStartDate={trip.startDate ? trip.startDate.toISOString().slice(0, 10) : undefined}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
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

        {/* ── Propuestas ──────────────────────────────────────────────────── */}
        {activeTab === "propuestas" && (
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
                  Propuestas del grupo
                </h2>
                <div className="flex items-center gap-2">
                  {isAdmin && <KmlImport tripId={tripId} />}
                  <CreateItemForm tripId={tripId} />
                </div>
              </div>

              {/* Unified filters — first */}
              <div id="tutorial-item-filters" className="mb-4">
                <Suspense fallback={null}>
                  <ItemFilterChipsServer
                    tripId={tripId}
                    typeFilter={itemType}
                    proposerFilter={proposer}
                    search={search}
                    participants={proposerOptions}
                  />
                </Suspense>
              </div>

              {/* Map — second */}
              <div className="mb-4">
                <Suspense fallback={null}>
                  <ItemsMapServer
                    tripId={tripId}
                    typeFilter={itemType}
                    proposerFilter={proposer}
                    search={search}
                    cityFilter={city}
                  />
                </Suspense>
              </div>

              {/* Proposals list — third */}
              <Suspense
                fallback={
                  <div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando actividades...</div>
                }
              >
                <ItemList
                  currentUserId={session.user.id}
                  tripId={tripId}
                  isAdmin={isAdmin}
                  canMutate={canEdit}
                  tripStartDate={trip.startDate}
                  tripEndDate={trip.endDate}
                  typeFilter={itemType}
                  search={search}
                  proposerFilter={proposer}
                  cityFilter={city}
                  notInItinerary={notInItinerary === "1"}
                />
              </Suspense>
            </div>
          </div>
        )}

        {/* ── Itinerario ──────────────────────────────────────────────────── */}
        {activeTab === "itinerario" && (
          <div>

            {/* ── Sub-tab: Itinerario ── */}
            {activeSubtab === "itinerario" && (
              <div className="mt-5">
                <div id="tutorial-activity-list">
                  {view === "calendar" ? (
                    <div className="relative -mx-4 md:-mx-6">
                      <Suspense fallback={<div className="px-4 py-4 text-sm text-zinc-400 md:px-6">Cargando calendario...</div>}>
                        <ItineraryCalendarServer
                          tripId={tripId}
                          startDate={trip.startDate}
                          endDate={trip.endDate}
                        />
                      </Suspense>
                    </div>
                  ) : (
                    <Suspense fallback={<div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando itinerario...</div>}>
                      <ActivityList
                        tripId={tripId}
                        canEdit={canEdit}
                        startDate={trip.startDate}
                        endDate={trip.endDate}
                      />
                    </Suspense>
                  )}
                </div>
              </div>
            )}

            {/* ── Sub-tab: Alojamiento ── */}
            {activeSubtab === "alojamiento" && (
              <div id="tutorial-hotel-section" className="mt-5">
                <HotelCollapsible
                  autoOpen
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
            )}

            {/* ── Sub-tab: Transporte ── */}
            {activeSubtab === "transporte" && (
              <div className="mt-5">
                <Suspense fallback={<div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando transportes...</div>}>
                  <TransportPanel
                    tripId={tripId}
                    canEdit={canEdit}
                    defaultCurrency={trip.defaultCurrency}
                    tripStartDate={trip.startDate ? trip.startDate.toISOString().slice(0, 10) : null}
                    tripEndDate={trip.endDate ? trip.endDate.toISOString().slice(0, 10) : null}
                  />
                </Suspense>
              </div>
            )}

            {/* ── Sub-tab: Entradas ── */}
            {activeSubtab === "entradas" && (
              <div className="mt-5">
                <Suspense fallback={<div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando entradas...</div>}>
                  <TicketsPanel
                    tripId={tripId}
                    defaultCurrency={trip.defaultCurrency}
                    participants={participantOptions}
                  />
                </Suspense>
              </div>
            )}

            {/* ── Sub-tab: Excursiones ── */}
            {activeSubtab === "excursiones" && (
              <div className="mt-5">
                <Suspense fallback={<div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando excursiones...</div>}>
                  <ExcursionsPanel
                    tripId={tripId}
                    tripStartDate={trip.startDate ? trip.startDate.toISOString().slice(0, 10) : undefined}
                    tripEndDate={trip.endDate ? trip.endDate.toISOString().slice(0, 10) : undefined}
                  />
                </Suspense>
              </div>
            )}
          </div>
        )}

        {/* ── Checklist ───────────────────────────────────────────────────── */}
        {activeTab === "checklist" && (
          <div>
            <h2 className="mb-4 text-base font-bold text-zinc-900 dark:text-zinc-100">Checklist</h2>
            <Suspense fallback={<div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando checklist...</div>}>
              <ChecklistPanel
                tripId={tripId}
                canEdit={canEdit}
                tripStartDate={trip.startDate ? trip.startDate.toISOString().slice(0, 10) : null}
                tripEndDate={trip.endDate ? trip.endDate.toISOString().slice(0, 10) : null}
              />
            </Suspense>
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

        {/* ── Listas ──────────────────────────────────────────────────────── */}
        {activeTab === "listas" && (
          <Suspense fallback={<div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando listas...</div>}>
            <ListsView
              tripId={tripId}
              myParticipantId={myParticipant.id}
              canEdit={canEdit}
            />
          </Suspense>
        )}

        {/* ── Galería ─────────────────────────────────────────────────────── */}
        {activeTab === "galería" && (
          <Suspense fallback={<div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando galería...</div>}>
            <GalleryView tripId={tripId} tripName={trip.name} />
          </Suspense>
        )}

        {/* ── Wishlist ─────────────────────────────────────────────────────── */}
        {activeTab === "wishlist" && (
          <Suspense fallback={<div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando wishlist...</div>}>
            <WishlistView
              tripId={tripId}
              myParticipantId={myParticipant.id}
              canEdit={canEdit}
              subtab={wishlistSubtab}
            />
          </Suspense>
        )}

      </main>

      <TripMobileNav
        tripId={tripId}
        activeTab={activeTab}
        activeSubtab={activeSubtab}
        isAdmin={isAdmin}
        adminIconsSlot={adminIconsSlot}
        signOutSlot={signOutSlot}
      />
      <TripLiveUpdater tripId={tripId} />
    </div>
    </DayCollapseProvider>
    </PersonalModeProvider>
  );
}
