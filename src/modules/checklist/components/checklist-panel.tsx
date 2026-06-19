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
        dueDate: true,
        isDone: true,
        assignees: { select: { participant: { select: { id: true, name: true } } } },
      },
      orderBy: [{ isDone: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.tripParticipant.findMany({
      where: { tripId },
      select: { id: true, name: true },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  return (
    <ChecklistPanelClient
      tripId={tripId}
      canEdit={canEdit}
      tripStartDate={tripStartDate ?? undefined}
      tripEndDate={tripEndDate ?? undefined}
      participants={participants}
      tasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        isDone: t.isDone,
        assignees: t.assignees.map((a) => a.participant),
      }))}
    />
  );
}
