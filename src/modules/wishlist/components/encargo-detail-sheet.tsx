"use client";

import { useEffect, useState } from "react";
import { useSheetHistory } from "@/lib/use-sheet-history";
import type { FriendRequest } from "../types";

function PlaceholderHero({ color }: { color: string }) {
  return (
    <div
      className="flex w-full items-center justify-center"
      style={{ aspectRatio: "16/9", background: `linear-gradient(135deg, ${color}22, ${color}44)` }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.25"
        strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 opacity-60">
        <path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/>
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
      </svg>
    </div>
  );
}

type Props = {
  req: FriendRequest;
  tripId: string;
  color: string;
  onClose: () => void;
  onToggleBought: (req: FriendRequest, cost?: number | null) => Promise<void>;
  onUpdate: (id: string, changes: Partial<FriendRequest>) => void;
};

export function EncargoDetailSheet({ req, tripId: _tripId, color, onClose, onToggleBought, onUpdate: _onUpdate }: Props) {
  const [toggling, setToggling] = useState(false);
  const [askingCost, setAskingCost] = useState(false);
  const [costInput, setCostInput] = useState("");

  useSheetHistory(onClose);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (askingCost) { setAskingCost(false); setCostInput(""); }
        else onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, askingCost]);

  // Reset cost input when a different req is shown
  useEffect(() => {
    setAskingCost(false);
    setCostInput("");
  }, [req.id]);

  async function handleMarkBought() {
    const cost = costInput.trim() ? Number(costInput.replace(",", ".")) : null;
    if (cost !== null && isNaN(cost)) return;
    setToggling(true);
    await onToggleBought(req, cost);
    setToggling(false);
    setAskingCost(false);
    setCostInput("");
  }

  async function handleUnmark() {
    setToggling(true);
    await onToggleBought(req, null);
    setToggling(false);
  }

  const fmtCost = (n: number) => n.toLocaleString("es-CL");

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 md:bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-zinc-900 md:bottom-auto md:left-1/2 md:top-1/2 md:right-auto md:w-110 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">

        {/* Handle mobile */}
        <div className="flex justify-center pt-2 pb-1 md:hidden">
          <button onClick={onClose} className="flex items-center justify-center p-1 text-zinc-300 dark:text-zinc-600" aria-label="Cerrar">
            <svg width="56" height="24" viewBox="0 0 56 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8l24 12 24-12" />
            </svg>
          </button>
        </div>

        {/* Imagen */}
        {req.imageUrl ? (
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 md:rounded-t-2xl"
            style={{ maxHeight: "55vh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={req.imageUrl} alt={req.name} className="w-full object-contain" style={{ maxHeight: "55vh" }} />
          </div>
        ) : (
          <PlaceholderHero color={color} />
        )}

        <div className="p-4 pb-8">
          {/* Badge del amigo */}
          <div
            className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ background: color }}
          >
            🎁 de {req.friendName}
          </div>

          <h2 className="mb-1 text-lg font-bold leading-tight text-zinc-900 dark:text-zinc-100">{req.name}</h2>

          {req.notes && (
            <p className="mb-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{req.notes}</p>
          )}

          {/* Estado de compra */}
          <div className="mb-4">
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${
              req.bought ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-zinc-50 dark:bg-zinc-800"
            }`}>
              <div className={`h-2 w-2 rounded-full ${req.bought ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"}`} />
              <p className={`flex-1 text-sm ${req.bought ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                {req.bought ? "Comprado ✓" : "Pendiente de compra"}
              </p>
              {req.bought && req.cost != null && (
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {fmtCost(req.cost)}
                </span>
              )}
            </div>
          </div>

          {/* Acciones */}
          {!req.bought && !askingCost && (
            <button
              onClick={() => setAskingCost(true)}
              disabled={toggling}
              className="w-full rounded-xl bg-emerald-50 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
            >
              ✓ Marcar como comprado
            </button>
          )}

          {/* Flujo de costo */}
          {!req.bought && askingCost && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  ¿Cuánto costó? <span className="font-normal">(opcional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Ej: 2500"
                  value={costInput}
                  onChange={(e) => setCostInput(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleMarkBought}
                  disabled={toggling}
                  className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {toggling ? "Guardando..." : "Confirmar"}
                </button>
                <button
                  onClick={() => { setAskingCost(false); setCostInput(""); }}
                  disabled={toggling}
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {req.bought && (
            <button
              onClick={handleUnmark}
              disabled={toggling}
              className="w-full rounded-xl bg-zinc-100 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {toggling ? "Actualizando..." : "✓ Comprado — desmarcar"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
