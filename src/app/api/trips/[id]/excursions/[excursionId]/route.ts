import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  activityIds: z.array(z.string()).optional(),
});

async function getParticipant(tripId: string, userId: string) {
  return prisma.tripParticipant.findFirst({
    where: { tripId, userId },
    select: { id: true, role: true },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; excursionId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId, excursionId } = await params;
  const participant = await getParticipant(tripId, session.user.id);
  if (!participant || participant.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const excursion = await prisma.excursion.findFirst({ where: { id: excursionId, tripId } });
  if (!excursion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const result = patchSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { activityIds, date, ...rest } = result.data;
  const dateChanged = date !== undefined && date !== excursion.date;

  const updated = await prisma.$transaction(async (tx) => {
    // Si cambia la fecha, batch-update todas las actividades vinculadas
    if (dateChanged && date) {
      await tx.activity.updateMany({
        where: { excursionId },
        data: { activityDate: new Date(date + "T00:00:00") },
      });
    }

    // Si se pasan activityIds, reemplazar las actividades vinculadas
    if (activityIds !== undefined) {
      // Desvincular las actuales
      await tx.activity.updateMany({
        where: { excursionId },
        data: { excursionId: null },
      });
      // Vincular las nuevas (solo las que pertenezcan al mismo trip)
      if (activityIds.length > 0) {
        await tx.activity.updateMany({
          where: { id: { in: activityIds }, tripId },
          data: {
            excursionId,
            // Si la excursión tiene fecha, propagarla a las actividades recién vinculadas
            ...(excursion.date || date ? { activityDate: new Date((date ?? excursion.date!) + "T00:00:00") } : {}),
          },
        });
      }
    }

    return tx.excursion.update({
      where: { id: excursionId },
      data: { ...rest, ...(date !== undefined ? { date } : {}) },
      include: {
        activities: {
          select: { id: true, title: true, activityDate: true, activityTime: true },
          orderBy: [{ activityTime: "asc" }],
        },
      },
    });
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; excursionId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tripId, excursionId } = await params;
  const participant = await getParticipant(tripId, session.user.id);
  if (!participant || participant.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const excursion = await prisma.excursion.findFirst({ where: { id: excursionId, tripId } });
  if (!excursion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Las actividades quedan desvinculadas (SetNull) automáticamente
  await prisma.excursion.delete({ where: { id: excursionId } });
  return NextResponse.json({ deleted: true });
}
