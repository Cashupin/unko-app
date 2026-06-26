"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getMapsUrl } from "@/lib/maps-url";
import { CheckInButton } from "@/modules/proposals/components/check-in-button";
import { VoteButtons } from "@/modules/proposals/components/vote-buttons";
import { AddToItineraryButton } from "@/modules/proposals/components/add-to-itinerary-button";
import { PhotoThumbnail } from "@/components/ui/photo-thumbnail";
import { EditItemForm } from "@/modules/proposals/components/edit-item-form";
import { DeleteItemButton } from "@/modules/proposals/components/delete-item-button";
import { getItemIcon, getItemGradient } from "@/modules/proposals/lib/item-icons";
import { ItemCommentsSection, type CommentEntry } from "@/modules/proposals/components/item-comments-section";
import type { ItemSummary } from "@/modules/proposals/types/item";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoteEntry = {
  value: "APPROVE" | "REJECT";
  userName: string | null;
  userImage: string | null;
};

export type ItemCardData = {
  id: string;
  title: string;
  type: "PLACE" | "FOOD" | "ACTIVITY";
  description: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  address: string | null;
  externalUrl: string | null;
  imageUrl: string | null;
  tripId: string;
  createdAt: string;
  createdById: string | null;
  createdByName: string | null;
  createdByImage: string | null;
  approvals: number;
  rejections: number;
  checksCount: number;
  commentsCount: number;
  unreadCommentsCount: number;
  status: "APPROVED" | "PENDING" | "REJECTED";
  myVote: "APPROVE" | "REJECT" | null;
  myCheck: { id: string; photoUrl: string | null; userName: string | null } | null;
  votes: VoteEntry[];
  checks: { id: string; photoUrl: string | null; userName: string | null }[];
  comments: CommentEntry[];
  canEdit: boolean;
  canDelete: boolean;
  canClaim: boolean;
  isAdmin: boolean;
  currentUserId: string;
  participants: { id: string; name: string }[];
  inItinerary: boolean;
  canAddToItinerary: boolean;
  tripStartDate: string | null;
  tripEndDate: string | null;
  // Full ItemSummary for EditItemForm compatibility
  itemSummary: ItemSummary;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS = { PLACE: "Lugar", FOOD: "Comida", ACTIVITY: "Actividad" } as const;

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
  const [locallySeen, setLocallySeen] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      if ((e as CustomEvent<{ id: string }>).detail.id === item.id) setOpen(true);
    }
    document.addEventListener("item:open-modal", handler);
    return () => document.removeEventListener("item:open-modal", handler);
  }, [item.id]);

  // Mark comments as seen once when the modal is opened (not on every render)
  useEffect(() => {
    if (!open || locallySeen || item.unreadCommentsCount === 0) return;
    setLocallySeen(true);
    fetch(`/api/items/${item.id}/comments/seen`, { method: "POST" }).catch(() => {});
  }, [open, locallySeen, item.id, item.unreadCommentsCount]);

  const unreadCommentsCount = locallySeen ? 0 : item.unreadCommentsCount;

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
              className="absolute bottom-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg bg-black/60 px-1 py-0.5 backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {item.canEdit && (
                <EditItemForm
                  item={item.itemSummary}
                  canClaim={item.canClaim}
                  isAdmin={item.isAdmin}
                  currentUserId={item.currentUserId}
                  participants={item.participants}
                />
              )}
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

          {/* Visits + Comments */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-violet-400">
              ✓ {item.checksCount} visita{item.checksCount !== 1 ? "s" : ""}
            </span>
            <span className="relative text-[11px] text-zinc-500">
              💬 {item.commentsCount}
              {unreadCommentsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold leading-none text-white">
                  {unreadCommentsCount > 9 ? "9+" : unreadCommentsCount}
                </span>
              )}
            </span>
          </div>

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

                {/* Comments section — always visible */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-[.07em] text-zinc-500">Comentarios</p>
                    <span className="rounded-full bg-[#27272a] px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                      {item.commentsCount}
                    </span>
                  </div>
                  <ItemCommentsSection
                    itemId={item.id}
                    comments={item.comments}
                    currentUserId={item.currentUserId}
                    isAdmin={item.isAdmin}
                  />
                </div>

                {/* Actions */}
                <div
                  className="flex flex-col gap-2 mt-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CheckInButton itemId={item.id} tripId={item.tripId} myCheck={item.myCheck} />

                  <VoteButtons
                    itemId={item.id}
                    myVote={item.myVote}
                    approvals={item.approvals}
                    rejections={item.rejections}
                  />

                  {item.canEdit && (
                    <EditItemForm
                      item={item.itemSummary}
                      canClaim={item.canClaim}
                      isAdmin={item.isAdmin}
                      currentUserId={item.currentUserId}
                      participants={item.participants}
                      trigger={
                        <button
                          type="button"
                          className="w-full rounded-xl border border-[#27272a] bg-[#18191c] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-[#27272a] hover:text-zinc-100"
                        >
                          ✎ Editar
                        </button>
                      }
                    />
                  )}

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
