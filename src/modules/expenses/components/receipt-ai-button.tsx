"use client";

import { useState } from "react";

export type ParsedReceiptItem = {
  description: string;
  amount: number;
  assignees: string[]; // participant IDs; empty = all participants
  groupKey: string;    // UUID shared by all items from the same receipt line
  groupQty: number;    // total units on that receipt line (e.g. 16 shots)
  itemQty: number;     // units this item represents (e.g. Juan took 6)
};

type RawItem = { id: number; description: string; amount: number; qty: number; groupKey: string };

type Participant = { id: string; name: string };

type Props = {
  receiptUrl: string;
  participants: Participant[];
  onApply: (items: ParsedReceiptItem[]) => void;
};

const AI_ENABLED = process.env.NEXT_PUBLIC_RECEIPT_AI_ENABLED === "true";

/** Converts per-item counters into ParsedReceiptItems grouped by count. */
function countersToItems(
  items: RawItem[],
  counters: Record<number, Record<string, number>>,
): ParsedReceiptItem[] {
  const result: ParsedReceiptItem[] = [];

  for (const item of items) {
    const unitPrice = item.amount / item.qty;
    const counter = counters[item.id] ?? {};
    const totalAssigned = Object.values(counter).reduce((a, b) => a + b, 0);

    if (totalAssigned === 0) {
      result.push({
        description: item.qty > 1 ? `${item.qty} x ${item.description}` : item.description,
        amount: item.amount,
        assignees: [],
        groupKey: item.groupKey,
        groupQty: item.qty,
        itemQty: item.qty,
      });
      continue;
    }

    // Group participants with the same count into a single item (equal split works)
    const countGroups = new Map<number, string[]>();
    for (const [id, count] of Object.entries(counter)) {
      if (count <= 0) continue;
      if (!countGroups.has(count)) countGroups.set(count, []);
      countGroups.get(count)!.push(id);
    }

    for (const [count, ids] of countGroups) {
      const groupAmount = Math.round(count * unitPrice * ids.length);
      result.push({
        description: item.qty > 1 ? `${count * ids.length} x ${item.description}` : item.description,
        amount: groupAmount,
        assignees: ids,
        groupKey: item.groupKey,
        groupQty: item.qty,
        itemQty: count,
      });
    }
  }

  return result;
}

export function ReceiptAiButton({ receiptUrl, participants, onApply }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "preview">("idle");
  const [rawItems, setRawItems] = useState<RawItem[]>([]);
  const [counters, setCounters] = useState<Record<number, Record<string, number>>>({});
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  if (!AI_ENABLED) return null;

  async function analyze() {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/ai/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: receiptUrl }),
      });
      const data = (await res.json()) as { items?: Omit<RawItem, "id">[]; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Error al analizar");
        setState("idle");
        return;
      }
      if (!data.items || data.items.length === 0) {
        setError("No se encontraron ítems en la boleta");
        setState("idle");
        return;
      }
      const items: RawItem[] = data.items.map((item, i) => ({
        ...item,
        id: i,
        groupKey: crypto.randomUUID(),
      }));
      setRawItems(items);
      setCounters(
        Object.fromEntries(
          items.map((item) => [
            item.id,
            Object.fromEntries(participants.map((p) => [p.id, 0])),
          ]),
        ),
      );
      setCollapsed(Object.fromEntries(items.map((item) => [item.id, false])));
      setState("preview");
    } catch {
      setError("Error de red");
      setState("idle");
    }
  }

  function increment(itemId: number, participantId: string) {
    const item = rawItems.find((i) => i.id === itemId)!;
    const assigned = Object.values(counters[itemId] ?? {}).reduce((a, b) => a + b, 0);
    if (assigned >= item.qty) return;
    setCounters((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [participantId]: (prev[itemId][participantId] ?? 0) + 1 },
    }));
  }

  function decrement(itemId: number, participantId: string) {
    if ((counters[itemId]?.[participantId] ?? 0) <= 0) return;
    setCounters((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [participantId]: prev[itemId][participantId] - 1 },
    }));
  }

  function toggleChip(itemId: number, participantId: string) {
    setCounters((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [participantId]: (prev[itemId][participantId] ?? 0) > 0 ? 0 : 1 },
    }));
  }

  function toggleCollapse(itemId: number) {
    setCollapsed((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }

  if (state === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-violet-200 dark:border-violet-900/50 bg-violet-50 dark:bg-violet-950/30 px-4 py-3">
        <span className="text-xl animate-pulse">✨</span>
        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 animate-pulse">Analizando boleta...</p>
      </div>
    );
  }

  if (state === "preview") {
    const completeItems = rawItems.filter((item) => {
      const assigned = Object.values(counters[item.id] ?? {}).reduce((a, b) => a + b, 0);
      return item.qty === 1 ? assigned >= 1 : assigned === item.qty;
    }).length;

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-violet-700 dark:text-violet-400">
            ✨ {rawItems.length} ítems detectados
          </p>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {completeItems}/{rawItems.length} asignados
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {rawItems.map((item) => {
            const unitPrice = item.amount / item.qty;
            const counter = counters[item.id] ?? {};
            const assigned = Object.values(counter).reduce((a, b) => a + b, 0);
            const remaining = item.qty - assigned;
            const isComplete = item.qty === 1 ? assigned >= 1 : remaining === 0;
            const isCollapsed = collapsed[item.id];
            const hasMultiple = item.qty > 1;

            return (
              <div
                key={item.id}
                className={`rounded-xl border bg-white overflow-hidden dark:bg-zinc-800 ${
                  isComplete
                    ? "border-emerald-200 dark:border-emerald-800/60"
                    : "border-zinc-200 dark:border-zinc-700"
                }`}
              >
                {/* Header */}
                <div
                  className={`flex items-center justify-between px-3 py-2.5 ${
                    hasMultiple ? "cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-700/40" : ""
                  }`}
                  onClick={() => hasMultiple && toggleCollapse(item.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {hasMultiple && (
                      <span
                        className={`text-zinc-400 text-[10px] transition-transform inline-block ${
                          isCollapsed ? "" : "rotate-90"
                        }`}
                      >
                        ▶
                      </span>
                    )}
                    <span className="text-xs font-medium text-zinc-800 truncate dark:text-zinc-200">
                      {item.description}
                    </span>
                    {hasMultiple && (
                      <span className="text-[10px] bg-zinc-100 text-zinc-500 rounded-full px-1.5 py-0.5 shrink-0 dark:bg-zinc-700 dark:text-zinc-400">
                        ×{item.qty}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {isComplete ? (
                      <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 dark:bg-emerald-950/40 dark:text-emerald-400">
                        ✓
                      </span>
                    ) : hasMultiple && assigned > 0 ? (
                      <span className="text-[10px] text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 dark:bg-amber-950/40 dark:text-amber-400">
                        {remaining} restante{remaining !== 1 ? "s" : ""}
                      </span>
                    ) : null}
                    <span className="text-xs tabular-nums font-semibold text-zinc-600 dark:text-zinc-400">
                      ${item.amount.toLocaleString("es-CL")}
                    </span>
                  </div>
                </div>

                {/* qty === 1: horizontal chip toggles */}
                {!hasMultiple && participants.length > 0 && (
                  <div className="border-t border-zinc-100 dark:border-zinc-700 px-3 py-2 flex flex-wrap gap-1.5">
                    {participants.map((p) => {
                      const selected = (counter[p.id] ?? 0) > 0;
                      const numSelected = Object.values(counter).filter((v) => v > 0).length;
                      const perPerson = numSelected > 0 ? Math.round(item.amount / numSelected) : null;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleChip(item.id, p.id)}
                          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            selected
                              ? "bg-violet-600 text-white dark:bg-violet-500"
                              : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600"
                          }`}
                        >
                          {p.name}
                          {selected && perPerson !== null && (
                            <span className="opacity-75 tabular-nums">
                              ${perPerson.toLocaleString("es-CL")}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* qty > 1: counter rows (collapsible) */}
                {hasMultiple && !isCollapsed && participants.length > 0 && (
                  <div className="border-t border-zinc-100 dark:border-zinc-700 divide-y divide-zinc-100 dark:divide-zinc-700/60">
                    {participants.map((p) => {
                      const count = counter[p.id] ?? 0;
                      const amount = Math.round(count * unitPrice);
                      const canIncrement = assigned < item.qty;

                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between py-1.5 px-3 transition-colors ${
                            count > 0
                              ? "bg-violet-50 dark:bg-violet-950/30"
                              : "bg-zinc-50 dark:bg-zinc-700/20"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-xs font-medium w-16 truncate ${
                                count > 0
                                  ? "text-violet-700 dark:text-violet-400"
                                  : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              {p.name}
                            </span>
                            {count > 0 && (
                              <span className="text-xs tabular-nums text-violet-500 dark:text-violet-400">
                                ${amount.toLocaleString("es-CL")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => decrement(item.id, p.id)}
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                                count > 0
                                  ? "bg-violet-100 text-violet-600 hover:bg-violet-200 dark:bg-violet-900/50 dark:text-violet-400 dark:hover:bg-violet-800/50"
                                  : "bg-zinc-100 text-zinc-300 dark:bg-zinc-700 dark:text-zinc-600"
                              }`}
                            >
                              −
                            </button>
                            <span
                              className={`w-5 text-center text-xs font-semibold tabular-nums ${
                                count > 0
                                  ? "text-violet-700 dark:text-violet-400"
                                  : "text-zinc-300 dark:text-zinc-600"
                              }`}
                            >
                              {count}
                            </span>
                            <button
                              type="button"
                              onClick={() => increment(item.id, p.id)}
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                                canIncrement
                                  ? "bg-violet-100 text-violet-600 hover:bg-violet-200 dark:bg-violet-900/50 dark:text-violet-400 dark:hover:bg-violet-800/50"
                                  : "bg-zinc-100 text-zinc-300 dark:bg-zinc-700 dark:text-zinc-600"
                              }`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onApply(countersToItems(rawItems, counters));
              setState("idle");
            }}
            className="flex-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700 transition-colors"
          >
            Usar ítems
          </button>
          <button
            type="button"
            onClick={() => setState("idle")}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-50 transition-colors dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            Descartar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={analyze}
        className="flex items-center gap-3 rounded-xl border border-violet-200 dark:border-violet-900/50 bg-violet-50 dark:bg-violet-950/30 px-4 py-3 text-left transition-colors hover:bg-violet-100 dark:hover:bg-violet-950/50"
      >
        <span className="text-xl">✨</span>
        <div className="flex-1">
          <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">Analizar con IA</p>
          <p className="text-[11px] text-violet-500 dark:text-violet-400">Detecta ítems y montos automáticamente</p>
        </div>
        <span className="text-violet-400 dark:text-violet-500 text-sm">→</span>
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
