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
    // Optimistic update
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

  // ── DnD ──────────────────────────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Determine if we're dragging a list
      const activeListIndex = lists.findIndex((l) => l.id === activeId);
      if (activeListIndex !== -1) {
        const overListIndex = lists.findIndex((l) => l.id === overId);
        if (overListIndex === -1) return;

        const newLists = [...lists];
        const [moved] = newLists.splice(activeListIndex, 1);
        newLists.splice(overListIndex, 0, moved);
        const reordered = newLists.map((l, i) => ({ ...l, order: i }));
        setLists(reordered);

        try {
          await api("/lists/reorder", "PATCH", { ids: reordered.map((l) => l.id) });
        } catch {
          toast.error("Error al reordenar");
          router.refresh();
        }
        return;
      }

      // Determine if we're dragging a section
      for (const list of lists) {
        const activeSectionIndex = list.sections.findIndex((s) => s.id === activeId);
        if (activeSectionIndex !== -1) {
          const overSectionIndex = list.sections.findIndex((s) => s.id === overId);
          if (overSectionIndex === -1) return;

          const newSections = [...list.sections];
          const [moved] = newSections.splice(activeSectionIndex, 1);
          newSections.splice(overSectionIndex, 0, moved);
          setLists((prev) =>
            prev.map((l) => (l.id === list.id ? { ...l, sections: newSections } : l))
          );

          try {
            await api(`/lists/${list.id}/sections/reorder`, "PATCH", {
              ids: newSections.map((s) => s.id),
            });
          } catch {
            toast.error("Error al reordenar");
            router.refresh();
          }
          return;
        }
      }

      // Dragging an item
      for (const list of lists) {
        const allItems = [
          ...list.items,
          ...list.sections.flatMap((s) => s.items),
        ];
        const activeItem = allItems.find((i) => i.id === activeId);
        if (!activeItem) continue;
        const overItem = allItems.find((i) => i.id === overId);
        if (!overItem) continue;

        let newItems = [...list.items];
        const newSections = list.sections.map((s) => ({ ...s, items: [...s.items] }));

        // Locate active item: direct list or inside a section
        const activeDirectIdx = newItems.findIndex((i) => i.id === activeId);
        let activeSectionId: string | null = null;
        let activeSectionItemIdx = -1;
        if (activeDirectIdx === -1) {
          for (const s of newSections) {
            const idx = s.items.findIndex((i) => i.id === activeId);
            if (idx !== -1) { activeSectionId = s.id; activeSectionItemIdx = idx; break; }
          }
        }

        // Locate over item: direct list or inside a section
        const overDirectIdx = newItems.findIndex((i) => i.id === overId);
        let overSectionId: string | null = null;
        let overSectionItemIdx = -1;
        if (overDirectIdx === -1) {
          for (const s of newSections) {
            const idx = s.items.findIndex((i) => i.id === overId);
            if (idx !== -1) { overSectionId = s.id; overSectionItemIdx = idx; break; }
          }
        }

        const sameContainer =
          (activeDirectIdx !== -1 && overDirectIdx !== -1) ||
          (activeSectionId !== null && activeSectionId === overSectionId);

        if (sameContainer) {
          // Same container: arrayMove handles both up and down correctly
          if (activeDirectIdx !== -1) {
            newItems = arrayMove(newItems, activeDirectIdx, overDirectIdx);
          } else {
            const section = newSections.find((s) => s.id === activeSectionId)!;
            section.items = arrayMove(section.items, activeSectionItemIdx, overSectionItemIdx);
          }
        } else {
          // Cross-container: remove from source, insert at target index
          let movedItem: typeof activeItem;
          if (activeDirectIdx !== -1) {
            movedItem = newItems[activeDirectIdx];
            newItems.splice(activeDirectIdx, 1);
          } else {
            const section = newSections.find((s) => s.id === activeSectionId)!;
            movedItem = section.items[activeSectionItemIdx];
            section.items.splice(activeSectionItemIdx, 1);
          }

          const targetSectionId = overDirectIdx !== -1 ? null : overSectionId;
          const updatedItem = { ...movedItem, sectionId: targetSectionId };

          if (overDirectIdx !== -1) {
            newItems.splice(overDirectIdx, 0, updatedItem);
          } else {
            const section = newSections.find((s) => s.id === overSectionId)!;
            section.items.splice(overSectionItemIdx, 0, updatedItem);
          }
        }

        setLists((prev) =>
          prev.map((l) =>
            l.id === list.id ? { ...l, items: newItems, sections: newSections } : l
          )
        );

        const payload = [
          ...newItems.map((i, idx) => ({ id: i.id, sectionId: null, order: idx })),
          ...newSections.flatMap((s) =>
            s.items.map((i, idx) => ({ id: i.id, sectionId: s.id, order: idx }))
          ),
        ];

        try {
          await api(`/lists/${list.id}/items/reorder`, "PATCH", { items: payload });
        } catch {
          toast.error("Error al reordenar");
          router.refresh();
        }
        return;
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
              {lists.map((list) => (
                <ShoppingListCard
                  key={list.id}
                  list={list}
                  tripId={tripId}
                  canEdit={canEdit}
                  myParticipantId={myParticipantId}
                  onAddItem={handleAddItem}
                  onToggleItem={handleToggleItem}
                  onDeleteItem={handleDeleteItem}
                  onEditItem={handleEditItem}
                  onAddSection={handleAddSection}
                  onDeleteSection={handleDeleteSection}
                  onRenameSection={handleRenameSection}
                  onDeleteList={handleDeleteList}
                  onEditList={handleEditList}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
