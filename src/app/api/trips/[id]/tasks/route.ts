import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

async function requireMember(tripId: string, userId: string) {
  return prisma.tripParticipant.findFirst({
    where: { tripId, userId },
    select: { role: true },
  });
}

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().max(50).optional(),
  dueDate: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
});

const TASK_SELECT = {
  id: true, title: true, description: true, category: true,
  dueDate: true, isDone: true, createdAt: true,
  createdBy: { select: { id: true, name: true, image: true } },
  assignees: { select: { participant: { select: { id: true, name: true } } } },
} as const;

// ─── GET /api/trips/[id]/tasks ───────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId } = await params;
  if (!(await requireMember(tripId, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tasks = await prisma.task.findMany({
    where: { tripId },
    select: TASK_SELECT,
    orderBy: [{ isDone: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ tasks });
}

// ─── POST /api/trips/[id]/tasks ──────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: tripId } = await params;
  const membership = await requireMember(tripId, session.user.id);
  if (!membership || membership.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = createTaskSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { title, description, category, dueDate, assigneeIds } = result.data;

  // Only allow assigning to participants of this trip
  const validAssigneeIds = assigneeIds?.length
    ? (
        await prisma.tripParticipant.findMany({
          where: { tripId, id: { in: assigneeIds } },
          select: { id: true },
        })
      ).map((p) => p.id)
    : [];

  const task = await prisma.task.create({
    data: {
      tripId,
      title,
      description: description ?? null,
      category: category ?? "OTRO",
      dueDate: dueDate ? new Date(dueDate) : null,
      createdById: session.user.id,
      assignees: {
        create: validAssigneeIds.map((participantId) => ({ participantId })),
      },
    },
    select: TASK_SELECT,
  });

  broadcast(`trip:${tripId}`, "update");
  return NextResponse.json(task, { status: 201 });
}
