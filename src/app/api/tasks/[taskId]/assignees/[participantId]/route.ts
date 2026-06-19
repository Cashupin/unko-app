import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

const toggleSchema = z.object({
  isDone: z.boolean(),
});

// ─── PATCH /api/tasks/[taskId]/assignees/[participantId] ──────────────────────
// Toggles a single assignee's completion status (Task.mode === "INDIVIDUAL")

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string; participantId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { taskId, participantId } = await params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, tripId: true },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId: task.tripId, userId: session.user.id },
    select: { role: true },
  });
  if (!membership || membership.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = toggleSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const assignee = await prisma.taskAssignee.findUnique({
    where: { taskId_participantId: { taskId, participantId } },
    select: { id: true },
  });
  if (!assignee) {
    return NextResponse.json({ error: "Assignee not found on this task" }, { status: 404 });
  }

  await prisma.taskAssignee.update({
    where: { taskId_participantId: { taskId, participantId } },
    data: { isDone: result.data.isDone },
  });

  broadcast(`trip:${task.tripId}`, "update");
  return NextResponse.json({ ok: true });
}
