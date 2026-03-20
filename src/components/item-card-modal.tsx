"use client";

import { useState } from "react";
import Image from "next/image";
import { getMapsUrl } from "@/lib/maps-url";
import { CheckInButton } from "@/components/check-in-button";
import { VoteButtons } from "@/components/vote-buttons";
import { AddToItineraryButton } from "@/components/add-to-itinerary-button";
import { PhotoThumbnail } from "@/components/ui/photo-thumbnail";
import { EditItemForm } from "@/components/edit-item-form";
import { DeleteItemButton } from "@/components/delete-item-button";
import type { ItemSummary } from "@/types/item";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoteEntry = {
  value: "APPROVE" | "REJECT";
  userName: string | null;
  userImage: string | null;
};

export type ItemCardData = {
  id: string;
  title: string;
  type: "PLACE" | "FOOD";
  description: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  address: string | null;
  externalUrl: string | null;
  imageUrl: string | null;
  tripId: string;
  createdAt: string;
  createdByName: string | null;
  createdByImage: string | null;
  approvals: number;
  rejections: number;
  checksCount: number;
  status: "APPROVED" | "PENDING" | "REJECTED";
  myVote: "APPROVE" | "REJECT" | null;
  myCheck: { id: string; photoUrl: string | null; userName: string | null } | null;
  votes: VoteEntry[];
  checks: { id: string; photoUrl: string | null; userName: string | null }[];
  canEdit: boolean;
  canDelete: boolean;
  inItinerary: boolean;
  canAddToItinerary: boolean;
  tripStartDate: string | null;
  tripEndDate: string | null;
  // Full ItemSummary for EditItemForm compatibility
  itemSummary: ItemSummary;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS = { PLACE: "Lugar", FOOD: "Comida" } as const;

// ─── Smart icon + gradient detection ──────────────────────────────────────────

const PLACE_ICONS: { icon: string; gradient: string; keywords: string[] }[] = [
  { icon: "⛩️",  gradient: "from-red-900 to-rose-950",        keywords: ["shrine","santuario","templo","temple","torii","jinja","taisha"] },
  { icon: "🌋",  gradient: "from-orange-900 to-red-950",      keywords: ["volcano","volcán","volcan","crater"] },
  { icon: "🏔️", gradient: "from-slate-700 to-slate-900",     keywords: ["mountain","montaña","cerro","cumbre","peak","fujisan","fuji","alps","alpes","hill", "monte"] },
  { icon: "🏖️", gradient: "from-cyan-800 to-blue-950",       keywords: ["beach","playa","costa","bahia","bahía","bay","shore","isla","island"] },
  { icon: "🌊",  gradient: "from-blue-800 to-cyan-950",       keywords: ["ocean","mar","sea","rio","river","lago","lake","waterfall","cascada","falls"] },
  { icon: "🌸",  gradient: "from-pink-900 to-rose-950",       keywords: ["park","parque","garden","jardin","jardín","botanical","flores","sakura","forest","bosque"] },
  { icon: "🎭",  gradient: "from-purple-900 to-violet-950",   keywords: ["museum","museo","gallery","galería","galeria","theater","teatro","arte","art","exhibition"] },
  { icon: "🏟️", gradient: "from-zinc-700 to-zinc-900",       keywords: ["stadium","estadio","arena","coliseo","colosseum"] },
  { icon: "🗼",  gradient: "from-indigo-800 to-blue-950",     keywords: ["tower","torre","eiffel","skytree","tokyo tower"] },
  { icon: "🌉",  gradient: "from-slate-800 to-zinc-950",      keywords: ["bridge","puente","viaduct"] },
  { icon: "🎡",  gradient: "from-violet-800 to-purple-950",   keywords: ["amusement","disneyland","disney","universal","parque de diversiones","ferris","funfair"] },
  { icon: "🌄",  gradient: "from-amber-800 to-orange-950",    keywords: ["mirador","viewpoint","panorama","lookout","observatory","observatorio"] },
  { icon: "🏯",  gradient: "from-blue-800 to-indigo-950",     keywords: ["castle","castillo","fort","fortaleza","kumamoto","himeji","matsumoto","jo","jō"] },
  { icon: "🗿",  gradient: "from-stone-700 to-stone-900",     keywords: ["ruins","ruinas","ancient","antiguo","moai","archaeological","arqueológico", "statue"] },
  { icon: "🕌",  gradient: "from-yellow-800 to-amber-950",    keywords: ["mosque","mezquita","cathedral","catedral","church","iglesia","basilica","basílica"] },
  { icon: "🌆",  gradient: "from-blue-900 to-slate-950",      keywords: ["city","ciudad","skyline","downtown","shibuya","shinjuku","akihabara","ginza"] },
  { icon: "⚡",  gradient: "from-yellow-600 to-amber-800",    keywords: ["pokemon","pokémon","pikachu","pokecenter","pokémon center","pokemon center","pokemart"] },
  { icon: "🎌",  gradient: "from-red-800 to-rose-950",        keywords: ["anime","manga","ghibli","studio ghibli","otaku","cosplay","maid cafe","maid café","akiba","nakano broadway","animate","jump"] },
];

const FOOD_ICONS: { icon: string; gradient: string; keywords: string[] }[] = [
  { icon: "🍣",  gradient: "from-rose-800 to-pink-950",       keywords: ["sushi","sashimi","nigiri","maki","omakase"] },
  { icon: "🍱",  gradient: "from-amber-800 to-yellow-950",    keywords: ["bento","izakaya","tempura","tonkatsu","katsu","yakitori","teriyaki","udon","soba"] },
  { icon: "🍕",  gradient: "from-red-800 to-orange-950",      keywords: ["pizza","italiana","italian","trattoria","pasta","risotto"] },
  { icon: "🍔",  gradient: "from-yellow-700 to-amber-900",    keywords: ["burger","hamburgesa","hamburguesa","smash","grill","bbq","americana"] },
  { icon: "🥩",  gradient: "from-red-900 to-rose-950",        keywords: ["steak","asado","parrilla","carne","wagyu","yakiniku","beef","barbecue"] },
  { icon: "🦞",  gradient: "from-orange-800 to-red-950",      keywords: ["seafood","mariscos","lobster","langosta","crab","cangrejo","oyster","ostra","fish","pescado"] },
  { icon: "☕",  gradient: "from-stone-700 to-stone-900",     keywords: ["café","cafe","coffee","espresso","brunch","bakery","panadería","pastelería"] },
  { icon: "🍦",  gradient: "from-pink-700 to-rose-900",       keywords: ["ice cream","helado","gelato","dessert","postre","dulce","sweet"] },
  { icon: "🍺",  gradient: "from-amber-700 to-yellow-900",    keywords: ["bar","cerveza","beer","pub","brewery","craft","cantina"] },
  { icon: "🥟",  gradient: "from-orange-800 to-amber-950",    keywords: ["ramen","gyoza","dumpling","dim sum","noodle","fideos","ichiran","ippudo"] },
];

function getItemIcon(type: "PLACE" | "FOOD", title: string): string {
  const lower = title.toLowerCase();
  const list = type === "PLACE" ? PLACE_ICONS : FOOD_ICONS;
  return list.find((e) => e.keywords.some((k) => lower.includes(k)))?.icon
    ?? (type === "PLACE" ? "📍" : "🍜");
}

function getItemGradient(type: "PLACE" | "FOOD", title: string): string {
  const lower = title.toLowerCase();
  const list = type === "PLACE" ? PLACE_ICONS : FOOD_ICONS;
  return list.find((e) => e.keywords.some((k) => lower.includes(k)))?.gradient
    ?? (type === "PLACE" ? "from-zinc-700 to-zinc-900" : "from-orange-700 to-amber-900");
}

const STATUS_BADGE = {
  APPROVED: "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400",
  PENDING: "bg-amber-500/20 border border-amber-500/40 text-amber-400",
  REJECTED: "bg-red-500/20 border border-red-500/40 text-red-400",
} as const;

const STATUS_LABEL = {
  APPROVED: "✓ Popular",
  PENDING: "Nueva",
  REJECTED: "Poco interés",
} as const;

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  name,
  image,
  size = 28,
}: {
  name: string | null;
  image?: string | null;
  size?: number;
}) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  if (image) {
    return (
      <img
        src={image}
        alt={name ?? ""}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials}
    </div>
  );
}

// ─── Card + Modal ─────────────────────────────────────────────────────────────

export function ItemCardWithModal({ item }: { item: ItemCardData }) {
  const [open, setOpen] = useState(false);
  const [votesOpen, setVotesOpen] = useState(false);

  const gradient = getItemGradient(item.type, item.title);
  const icon = getItemIcon(item.type, item.title);
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("es-CL", { day: "numeric", month: "short" });

  return (
    <>
      {/* ── Card ── */}
      <div
        id={`item-${item.id}`}
        className="group relative rounded-2xl border border-[#2d2d31] bg-[#1f2023] overflow-hidden cursor-pointer transition-all duration-200 hover:border-[#3f3f46] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 flex flex-col"
        onClick={() => setOpen(true)}
      >
        {/* Image area */}
        <div className="relative h-40 w-full shrink-0">
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
          ) : (
            <div className={`h-full w-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <span className="text-5xl opacity-75 select-none drop-shadow">{icon}</span>
            </div>
          )}

          {/* Category badge — top left */}
          <span className="absolute top-2.5 left-2.5 rounded-full px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm bg-black/55 text-white border border-white/10">
            {icon} {TYPE_LABELS[item.type]}
          </span>

          {/* Status badge — top right */}
          <span className={`absolute top-2.5 right-2.5 rounded-full px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm ${STATUS_BADGE[item.status]}`}>
            {STATUS_LABEL[item.status]}
          </span>

          {/* Edit/Delete — bottom right, hover only, stop propagation */}
          {(item.canEdit || item.canDelete) && (
            <div
              className="absolute bottom-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              {item.canEdit && <EditItemForm item={item.itemSummary} />}
              {item.canDelete && <DeleteItemButton itemId={item.id} />}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-4 pt-3 pb-1 flex-1">
          <h3 className="font-semibold text-[15px] text-zinc-100 truncate leading-snug">
            {item.title}
          </h3>
          {(item.location || item.address) && (
            <p className="text-[12px] text-zinc-400 truncate mt-0.5">
              📍 {item.location || item.address}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 mt-auto flex items-center justify-between border-t border-[#2d2d31]">
          {/* Votes */}
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
              👍 {item.approvals}
            </span>
            {item.rejections > 0 && (
              <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] text-red-400">
                👎 {item.rejections}
              </span>
            )}
          </div>

          {/* Visits */}
          <span className="text-[11px] text-violet-400">
            ✓ {item.checksCount} visita{item.checksCount !== 1 ? "s" : ""}
          </span>

          {/* Avatar + date */}
          <div className="flex items-center gap-1.5">
            <Avatar name={item.createdByName} image={item.createdByImage} size={22} />
            <span className="text-[11px] text-zinc-500">{fmtDate(item.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full sm:max-w-[520px] bg-[#1f2023] border border-[#2d2d31] sm:rounded-3xl rounded-t-3xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1">
              {/* Image header */}
              <div className="relative h-52 shrink-0">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                ) : (
                  <div className={`h-full w-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                    <span className="text-7xl opacity-75 select-none drop-shadow">{icon}</span>
                  </div>
                )}
                {/* Close */}
                <button
                  onClick={() => setOpen(false)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/55 flex items-center justify-center text-white text-sm hover:bg-black/75 transition-colors"
                >
                  ✕
                </button>
                {/* Status — bottom left */}
                <span className={`absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm ${STATUS_BADGE[item.status]}`}>
                  {STATUS_LABEL[item.status]}
                </span>
                {/* Category — bottom right */}
                <span className="absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm bg-black/55 text-white border border-white/10">
                  {icon} {TYPE_LABELS[item.type]}
                </span>
              </div>

              {/* Body */}
              <div className="p-5">
                {/* Title + location */}
                <h2 className="text-xl font-bold text-zinc-100 mb-1">{item.title}</h2>
                {(item.location || item.address) && (
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-[13px] text-zinc-400">
                      📍 {item.location || item.address}
                    </p>
                    <a
                      href={getMapsUrl(item.location ?? item.address ?? "", item.locationLat, item.locationLng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 text-[12px] text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Ver en Maps →
                    </a>
                  </div>
                )}

                {/* External URL */}
                {item.externalUrl && (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="block text-[12px] text-blue-400 underline underline-offset-2 truncate mb-3"
                  >
                    {item.externalUrl}
                  </a>
                )}

                {/* Description */}
                {item.description && (
                  <p className="text-[13px] text-zinc-300 leading-relaxed mb-4">{item.description}</p>
                )}

                <div className="border-t border-[#2d2d31] my-4" />

                {/* Voting section — collapsible */}
                <div className="mb-4">
                  <button
                    className="flex items-center justify-between w-full group/vote"
                    onClick={() => setVotesOpen((v) => !v)}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[.07em] text-zinc-500 group-hover/vote:text-zinc-400 transition-colors">
                      Reacciones
                    </p>
                    <span
                      className={`text-[9px] text-zinc-500 transition-transform duration-200 ${votesOpen ? "rotate-90" : ""}`}
                    >
                      ▶
                    </span>
                  </button>

                  {votesOpen && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {item.votes.length === 0 ? (
                        <p className="text-[13px] text-zinc-500 italic py-1">Sin votos aún.</p>
                      ) : (
                        item.votes.map((v, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2.5 rounded-xl bg-[#27272a] px-3 py-2"
                          >
                            <Avatar name={v.userName} image={v.userImage} size={30} />
                            <span className="flex-1 text-[13px] text-zinc-200">
                              {v.userName ?? "Usuario"}
                            </span>
                            {v.value === "APPROVE" ? (
                              <span className="text-[12px] text-emerald-400 font-medium">👍 Le gustó</span>
                            ) : (
                              <span className="text-[12px] text-red-400 font-medium">👎 No le gustó</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Check-ins section — always visible */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-[.07em] text-zinc-500">Visitas</p>
                    <span className="rounded-full bg-[#27272a] px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                      {item.checksCount}
                    </span>
                  </div>

                  {item.checks.length === 0 ? (
                    <p className="text-[13px] text-zinc-500 italic">Sin visitas registradas aún.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {item.checks.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-2.5 rounded-xl bg-[#27272a] px-3 py-2"
                        >
                          <Avatar name={c.userName} size={30} />
                          <span className="flex-1 text-[13px] text-zinc-200">{c.userName ?? "Usuario"}</span>
                          {c.photoUrl ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <PhotoThumbnail url={c.photoUrl} alt={`Foto de ${c.userName ?? "visita"}`} />
                            </div>
                          ) : (
                            <span className="text-[11px] text-zinc-600">Sin foto</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div
                  className="flex flex-col gap-2 mt-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CheckInButton itemId={item.id} myCheck={item.myCheck} />

                  <VoteButtons
                    itemId={item.id}
                    myVote={item.myVote}
                    approvals={item.approvals}
                    rejections={item.rejections}
                  />

                  {item.canAddToItinerary && (
                    <AddToItineraryButton
                      tripId={item.tripId}
                      itemId={item.id}
                      title={item.title}
                      tripStartDate={item.tripStartDate ? new Date(item.tripStartDate) : null}
                      tripEndDate={item.tripEndDate ? new Date(item.tripEndDate) : null}
                      inItinerary={item.inItinerary}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
