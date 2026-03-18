"use client";

import { useState } from "react";
import { CURRENCY_SYMBOLS, fmtAmount } from "@/lib/constants";
import type { Currency } from "@/lib/constants";
import { toast } from "sonner";

type ShareItem = {
  id: string;
  description: string;
  amount: number;
  itemQty: number | null;
  assignedTo: { id: string; name: string }[];
};

type ShareExpense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  receiptUrl: string | null;
  expenseDate: string;
  paidBy: { name: string } | null;
  participants: { id: string; name: string }[];
  items: ShareItem[];
};

export function ShareExpenseClaim({
  expense,
  token,
}: {
  expense: ShareExpense;
  token: string;
}) {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [itemQtys, setItemQtys] = useState<Map<string, number>>(new Map());
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const sym = (c: string) => CURRENCY_SYMBOLS[c as Currency] ?? c;
  const unitPrice = (item: ShareItem) => item.amount / (item.itemQty ?? 1);

  const unassignedItems = expense.items.filter((item) => item.assignedTo.length === 0);
  const assignedItems = expense.items.filter((item) => item.assignedTo.length > 0);

  const selectedItems = Array.from(itemQtys.entries()).filter(([, qty]) => qty > 0);
  const totalClaimed = selectedItems.reduce((sum, [id, qty]) => {
    const item = unassignedItems.find((i) => i.id === id);
    return sum + (item ? unitPrice(item) * qty : 0);
  }, 0);

  function setQty(itemId: string, qty: number) {
    setItemQtys((prev) => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(itemId);
      else next.set(itemId, qty);
      return next;
    });
  }

  function toggleItem(item: ShareItem) {
    const current = itemQtys.get(item.id) ?? 0;
    setQty(item.id, current > 0 ? 0 : 1);
  }

  function handleSelectName(name: string) {
    setSelectedName(name);
    setItemQtys(new Map());
    setShowCustomInput(false);
  }

  function handleAddCustomName() {
    const name = customName.trim();
    if (!name) return;
    setSelectedName(name);
    setItemQtys(new Map());
    setShowCustomInput(false);
  }

  async function handleClaim() {
    if (!selectedName || selectedItems.length === 0) return;
    setClaiming(true);
    try {
      const res = await fetch(`/api/share/${token}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimerName: selectedName,
          items: selectedItems.map(([id, qty]) => ({ id, qty })),
        }),
      });
      if (res.ok) {
        setClaimed(true);
        toast.success("¡Ítems reclamados!");
      } else {
        const data = (await res.json()) as { error?: string; conflict?: boolean };
        if (data.conflict) {
          toast.error("Algunos ítems ya fueron reclamados. Recargando...");
          window.location.reload();
        } else {
          toast.error(data.error ?? "Error al reclamar");
        }
      }
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setClaiming(false);
    }
  }

  if (claimed) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">✓</div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">¡Listo!</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Tus ítems fueron reclamados correctamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-4">

        {/* Header */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 shadow-sm">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            {expense.description}
          </h1>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {sym(expense.currency)} {fmtAmount(expense.amount, expense.currency)}
          </p>
          {expense.paidBy && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Pagó: <span className="font-medium">{expense.paidBy.name}</span>
            </p>
          )}
        </div>

        {/* Who are you? */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 shadow-sm">
          <h2 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
            ¿Quién eres?
          </h2>
          <div className="flex flex-wrap gap-2">
            {expense.participants.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectName(p.name)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedName === p.name
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {p.name}
              </button>
            ))}
            {/* Show custom name chip if set and not in list */}
            {selectedName && !expense.participants.find((p) => p.name === selectedName) && (
              <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                {selectedName}
              </span>
            )}
          </div>

          {!showCustomInput ? (
            <button
              onClick={() => setShowCustomInput(true)}
              className="mt-3 text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
            >
              No estoy en la lista →
            </button>
          ) : (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCustomName()}
                placeholder="Tu nombre"
                autoFocus
                className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-400"
              />
              <button
                onClick={handleAddCustomName}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium"
              >
                OK
              </button>
              <button
                onClick={() => { setShowCustomInput(false); setCustomName(""); }}
                className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-sm"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Unassigned items */}
        {unassignedItems.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 shadow-sm">
            <h2 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
              Ítems sin reclamar
            </h2>
            <div className="flex flex-col gap-2">
              {unassignedItems.map((item) => {
                const maxQty = item.itemQty ?? 1;
                const isMulti = maxQty > 1;
                const selectedQty = itemQtys.get(item.id) ?? 0;
                const selected = selectedQty > 0;
                const claimedAmount = unitPrice(item) * selectedQty;

                if (isMulti) {
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        selected
                          ? "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800"
                          : "bg-zinc-50 dark:bg-zinc-800/50 border-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          {item.description}
                        </span>
                        <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 ml-3 shrink-0">
                          {sym(expense.currency)} {fmtAmount(item.amount, expense.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => selectedName && setQty(item.id, Math.max(0, selectedQty - 1))}
                            disabled={!selectedName || selectedQty === 0}
                            className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold disabled:opacity-30 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors flex items-center justify-center text-base leading-none"
                          >
                            −
                          </button>
                          <span className={`text-sm font-semibold w-6 text-center tabular-nums ${
                            selected ? "text-violet-600 dark:text-violet-400" : "text-zinc-400 dark:text-zinc-500"
                          }`}>
                            {selectedQty}
                          </span>
                          <button
                            onClick={() => selectedName && setQty(item.id, Math.min(maxQty, selectedQty + 1))}
                            disabled={!selectedName || selectedQty >= maxQty}
                            className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold disabled:opacity-30 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors flex items-center justify-center text-base leading-none"
                          >
                            +
                          </button>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">de {maxQty}</span>
                        </div>
                        {selected ? (
                          <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                            {sym(expense.currency)} {fmtAmount(claimedAmount, expense.currency)}
                          </span>
                        ) : !selectedName ? (
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">Selecciona tu nombre</span>
                        ) : null}
                      </div>
                    </div>
                  );
                }

                // Single unit item — toggle
                return (
                  <button
                    key={item.id}
                    onClick={() => selectedName && toggleItem(item)}
                    disabled={!selectedName}
                    className={`flex items-center justify-between p-3 rounded-xl text-left transition-colors border ${
                      !selectedName
                        ? "opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800/50 border-transparent"
                        : selected
                        ? "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800"
                        : "bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        selected ? "bg-violet-500 text-white" : "bg-zinc-200 dark:bg-zinc-700"
                      }`}>
                        {selected ? "✓" : ""}
                      </span>
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {item.description}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-3 shrink-0">
                      {sym(expense.currency)} {fmtAmount(item.amount, expense.currency)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Already assigned items */}
        {assignedItems.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 shadow-sm">
            <h2 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
              Ya asignados
            </h2>
            <div className="flex flex-col gap-2">
              {assignedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {item.description}
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {item.assignedTo.map((p) => p.name).join(", ")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 ml-3 shrink-0">
                    {sym(expense.currency)} {fmtAmount(item.amount, expense.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Claim button */}
        {unassignedItems.length > 0 ? (
          <div className="flex flex-col gap-2">
            {selectedItems.length > 0 && (
              <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                Tu total: {sym(expense.currency)} {fmtAmount(totalClaimed, expense.currency)}
              </p>
            )}
            <button
              onClick={handleClaim}
              disabled={!selectedName || selectedItems.length === 0 || claiming}
              className="w-full py-3.5 rounded-2xl bg-zinc-900 text-white font-medium text-sm dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-40 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              {claiming
                ? "Reclamando..."
                : selectedItems.length === 0
                ? "Selecciona los ítems que consumiste"
                : `Reclamar ${selectedItems.length} ítem${selectedItems.length > 1 ? "s" : ""}`}
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 py-4">
            Todos los ítems ya fueron reclamados.
          </p>
        )}

      </div>
    </div>
  );
}
