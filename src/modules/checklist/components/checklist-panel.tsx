import { prisma } from "@/lib/prisma";
import { ChecklistPanelClient } from "@/modules/checklist/components/checklist-panel-client";

export async function ChecklistPanel({
  tripId,
  canEdit,
  tripStartDate,
  tripEndDate,
}: {
  tripId: string;
  canEdit: boolean;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
}) {
  const [tasks, participants] = await Promise.all([
    prisma.task.findMany({
      where: { tripId },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        mode: true,
        dueDate: true,
        isDone: true,
        assignees: { select: { isDone: true, participant: { select: { id: true, name: true } } } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.tripParticipant.findMany({
      where: { tripId },
      select: { id: true, name: true },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  const mapped = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    mode: t.mode,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    isDone: t.isDone,
    assignees: t.assignees.map((a) => ({ ...a.participant, isDone: a.isDone })),
  }));

  function isEffectivelyDone(t: (typeof mapped)[number]): boolean {
    return t.mode === "INDIVIDUAL"
      ? t.assignees.length > 0 && t.assignees.every((a) => a.isDone)
      : t.isDone;
  }

  // Pending tasks first, completed ones last (DB orderBy already sorted by date within each group)
  const sorted = [...mapped].sort((a, b) => Number(isEffectivelyDone(a)) - Number(isEffectivelyDone(b)));

  return (
    <ChecklistPanelClient
      tripId={tripId}
      canEdit={canEdit}
      tripStartDate={tripStartDate ?? undefined}
      tripEndDate={tripEndDate ?? undefined}
      participants={participants}
      tasks={sorted}
    />
  );
}
