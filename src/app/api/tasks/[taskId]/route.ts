import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  category: z.string().trim().max(50).optional(),
  mode: z.enum(["SHARED", "INDIVIDUAL"]).optional(),
  dueDate: z.string().nullable().optional(),
  isDone: z.boolean().optional(),
  assigneeIds: z.array(z.string()).optional(),
});

const TASK_SELECT = {
  id: true, title: true, description: true, category: true, mode: true,
  dueDate: true, isDone: true, createdAt: true,
  createdBy: { select: { id: true, name: true, image: true } },
  assignees: { select: { isDone: true, participant: { select: { id: true, name: true } } } },
} as const;

async function requireEditorOnTask(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, tripId: true },
  });
  if (!task) return { task: null, membership: null };
  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId: task.tripId, userId },
    select: { role: true },
  });
  return { task, membership };
}

// ─── PATCH /api/tasks/[taskId] ────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { taskId } = await params;

  const { task, membership } = await requireEditorOnTask(taskId, session.user.id);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (!membership || membership.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = updateTaskSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { title, description, category, mode, dueDate, isDone, assigneeIds } = result.data;

  let validAssigneeIds: string[] | undefined;
  if (assigneeIds !== undefined) {
    validAssigneeIds = (
      await prisma.tripParticipant.findMany({
        where: { tripId: task.tripId, id: { in: assigneeIds } },
        select: { id: true },
      })
    ).map((p) => p.id);
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      description: description === undefined ? undefined : description,
      category,
      mode,
      dueDate: dueDate === undefined ? undefined : (dueDate ? new Date(dueDate) : null),
      isDone,
      ...(validAssigneeIds !== undefined && {
        assignees: {
          deleteMany: {},
          create: validAssigneeIds.map((participantId) => ({ participantId })),
        },
      }),
    },
    select: TASK_SELECT,
  });

  broadcast(`trip:${task.tripId}`, "update");
  return NextResponse.json(updated);
}

// ─── DELETE /api/tasks/[taskId] ───────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { taskId } = await params;

  const { task, membership } = await requireEditorOnTask(taskId, session.user.id);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (!membership || membership.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.task.delete({ where: { id: taskId } });
  broadcast(`trip:${task.tripId}`, "update");
  return new NextResponse(null, { status: 204 });
}
