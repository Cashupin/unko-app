"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { ShoppingListCard } from "./shopping-list-card";
import { CreateListModal } from "./create-list-modal";
import type { ShoppingList } from "../types";

type Props = {
  tripId: string;
  myParticipantId: string;
  canEdit: boolean;
  initialLists: ShoppingList[];
};

export function ListsClient({ tripId, myParticipantId, canEdit, initialLists }: Props) {
  const [lists, setLists] = useState<ShoppingList[]>(initialLists);
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // ── API helpers ──────────────────────────────────────────────────────────────

  async function api(path: string, method: string, body?: unknown) {
    const res = await fetch(`/api/trips/${tripId}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Error desconocido" }));
      throw new Error(err.error ?? "Error desconocido");
    }
    return res.json();
  }

  // ── Lists ────────────────────────────────────────────────────────────────────

  async function handleCreateList(data: { title: string; emoji?: string; visibility: "PRIVATE" | "TRIP" }) {
    try {
      const list = await api("/lists", "POST", data);
      setLists((prev) => [...prev, { ...list, sections: [], items: [] }]);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDeleteList(listId: string) {
    setLists((prev) => prev.filter((l) => l.id !== listId));
    try {
      await api(`/lists/${listId}`, "DELETE");
    } catch (e) {
      toast.error((e as Error).message);
      router.refresh();
    }
  }

  async function handleEditList(listId: string, data: { title?: string; emoji?: string | null }) {
    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, ...data } : l))
    );
    try {
      await api(`/lists/${listId}`, "PATCH", data);
    } catch (e) {
      toast.error((e as Error).message);
      router.refresh();
    }
  }

  // ── Sections ─────────────────────────────────────────────────────────────────

  async function handleAddSection(listId: string, title: string) {
    try {
      const section = await api(`/lists/${listId}/sections`, "POST", { title });
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? { ...l, sections: [...l.sections, { ...section, items: [] }] }
            : l
        )
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDeleteSection(listId: string, sectionId: string) {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        const removedItems = l.sections.find((s) => s.id === sectionId)?.items ?? [];
        return {
          ...l,
          sections: l.sections.filter((s) => s.id !== sectionId),
          items: [...l.items, ...removedItems.map((i) => ({ ...i, sectionId: null }))],
        };
      })
    );
    try {
      await api(`/lists/${listId}/sections/${sectionId}`, "DELETE");
    } catch (e) {
      toast.error((e as Error).message);
      router.refresh();
    }
  }

  async function handleRenameSection(listId: string, sectionId: string, title: string) {
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, sections: l.sections.map((s) => (s.id === sectionId ? { ...s, title } : s)) }
          : l
      )
    );
    try {
      await api(`/lists/${listId}/sections/${sectionId}`, "PATCH", { title });
    } catch (e) {
      toast.error((e as Error).message);
      router.refresh();
    }
  }

  async function handleMoveSection(listId: string, sectionId: string, direction: "up" | "down") {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;

    const idx = list.sections.findIndex((s) => s.id === sectionId);
    if (idx === -1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.sections.length) return;

    const newSections = [...list.sections];
    [newSections[idx], newSections[targetIdx]] = [newSections[targetIdx], newSections[idx]];

    setLists((prev) => prev.map((l) => l.id === listId ? { ...l, sections: newSections } : l));

    try {
      await api(`/lists/${listId}/sections/reorder`, "PATCH", { ids: newSections.map((s) => s.id) });
    } catch {
      toast.error("Error al reordenar");
      router.refresh();
    }
  }

  // ── Items ─────────────────────────────────────────────────────────────────────

  async function handleAddItem(listId: string, data: { text: string; sectionId?: string }) {
    try {
      const item = await api(`/lists/${listId}/items`, "POST", data);
      setLists((prev) =>
        prev.map((l) => {
          if (l.id !== listId) return l;
          if (data.sectionId) {
            return {
              ...l,
              sections: l.sections.map((s) =>
                s.id === data.sectionId ? { ...s, items: [...s.items, item] } : s
              ),
            };
          }
          return { ...l, items: [...l.items, item] };
        })
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleToggleItem(listId: string, itemId: string, checked: boolean) {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        const updateItem = (items: typeof l.items) =>
          items.map((i) =>
            i.id === itemId
              ? { ...i, checked, checkedAt: checked ? new Date().toISOString() : null, checkedByParticipant: checked ? { id: myParticipantId, name: "Tú" } : null }
              : i
          );
        return {
          ...l,
          items: updateItem(l.items),
          sections: l.sections.map((s) => ({ ...s, items: updateItem(s.items) })),
        };
      })
    );
    try {
      await api(`/lists/${listId}/items/${itemId}`, "PATCH", { checked });
    } catch (e) {
      toast.error((e as Error).message);
      router.refresh();
    }
  }

  async function handleDeleteItem(listId: string, itemId: string) {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          items: l.items.filter((i) => i.id !== itemId),
          sections: l.sections.map((s) => ({ ...s, items: s.items.filter((i) => i.id !== itemId) })),
        };
      })
    );
    try {
      await api(`/lists/${listId}/items/${itemId}`, "DELETE");
    } catch (e) {
      toast.error((e as Error).message);
      router.refresh();
    }
  }

  async function handleEditItem(listId: string, itemId: string, text: string, notes: string | null) {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        const updateItem = (items: typeof l.items) =>
          items.map((i) => (i.id === itemId ? { ...i, text, notes } : i));
        return {
          ...l,
          items: updateItem(l.items),
          sections: l.sections.map((s) => ({ ...s, items: updateItem(s.items) })),
        };
      })
    );
    try {
      await api(`/lists/${listId}/items/${itemId}`, "PATCH", { text, notes });
    } catch (e) {
      toast.error((e as Error).message);
      router.refresh();
    }
  }

  async function handleMoveItem(listId: string, itemId: string, direction: "up" | "down") {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;

    // Check direct items first
    const directIdx = list.items.findIndex((i) => i.id === itemId);
    if (directIdx !== -1) {
      const targetIdx = direction === "up" ? directIdx - 1 : directIdx + 1;
      if (targetIdx < 0 || targetIdx >= list.items.length) return;

      const newItems = [...list.items];
      [newItems[directIdx], newItems[targetIdx]] = [newItems[targetIdx], newItems[directIdx]];
      setLists((prev) => prev.map((l) => l.id === listId ? { ...l, items: newItems } : l));

      const payload = [
        ...newItems.map((i, idx) => ({ id: i.id, sectionId: null, order: idx })),
        ...list.sections.flatMap((s) => s.items.map((i, idx) => ({ id: i.id, sectionId: s.id, order: idx }))),
      ];
      try {
        await api(`/lists/${listId}/items/reorder`, "PATCH", { items: payload });
      } catch {
        toast.error("Error al reordenar");
        router.refresh();
      }
      return;
    }

    // Check sections
    for (const section of list.sections) {
      const sectionIdx = section.items.findIndex((i) => i.id === itemId);
      if (sectionIdx === -1) continue;

      const targetIdx = direction === "up" ? sectionIdx - 1 : sectionIdx + 1;
      if (targetIdx < 0 || targetIdx >= section.items.length) return;

      const newSectionItems = [...section.items];
      [newSectionItems[sectionIdx], newSectionItems[targetIdx]] = [newSectionItems[targetIdx], newSectionItems[sectionIdx]];
      const newSections = list.sections.map((s) => s.id === section.id ? { ...s, items: newSectionItems } : s);
      setLists((prev) => prev.map((l) => l.id === listId ? { ...l, sections: newSections } : l));

      const payload = [
        ...list.items.map((i, idx) => ({ id: i.id, sectionId: null, order: idx })),
        ...newSections.flatMap((s) => s.items.map((i, idx) => ({ id: i.id, sectionId: s.id, order: idx }))),
      ];
      try {
        await api(`/lists/${listId}/items/reorder`, "PATCH", { items: payload });
      } catch {
        toast.error("Error al reordenar");
        router.refresh();
      }
      return;
    }
  }

  async function handleMoveList(listId: string, direction: "up" | "down") {
    const idx = lists.findIndex((l) => l.id === listId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= lists.length) return;

    const newLists = arrayMove(lists, idx, targetIdx);
    setLists(newLists);
    try {
      await api("/lists/reorder", "PATCH", { ids: newLists.map((l) => l.id) });
    } catch {
      toast.error("Error al reordenar");
      router.refresh();
    }
  }

  // ── DnD — solo reordena listas ────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeIdx = lists.findIndex((l) => l.id === active.id);
      const overIdx = lists.findIndex((l) => l.id === over.id);
      if (activeIdx === -1 || overIdx === -1) return;

      const newLists = arrayMove(lists, activeIdx, overIdx);
      setLists(newLists);

      try {
        await api("/lists/reorder", "PATCH", { ids: newLists.map((l) => l.id) });
      } catch {
        toast.error("Error al reordenar");
        router.refresh();
      }
    },
    [lists, tripId, router]
  );

  const listIds = lists.map((l) => l.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Listas</h2>
        {canEdit && <CreateListModal onSubmit={handleCreateList} />}
      </div>

      {lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-700">
          <span className="text-4xl">📋</span>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No hay listas todavía</p>
          {canEdit && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Crea una lista para empezar</p>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={listIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-4">
              {lists.map((list, idx) => (
                <ShoppingListCard
                  key={list.id}
                  list={list}
                  tripId={tripId}
                  canEdit={canEdit}
                  myParticipantId={myParticipantId}
                  isFirst={idx === 0}
                  isLast={idx === lists.length - 1}
                  onAddItem={handleAddItem}
                  onToggleItem={handleToggleItem}
                  onDeleteItem={handleDeleteItem}
                  onEditItem={handleEditItem}
                  onAddSection={handleAddSection}
                  onDeleteSection={handleDeleteSection}
                  onRenameSection={handleRenameSection}
                  onDeleteList={handleDeleteList}
                  onEditList={handleEditList}
                  onMoveItem={handleMoveItem}
                  onMoveSection={handleMoveSection}
                  onMoveListUp={() => handleMoveList(list.id, "up")}
                  onMoveListDown={() => handleMoveList(list.id, "down")}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
