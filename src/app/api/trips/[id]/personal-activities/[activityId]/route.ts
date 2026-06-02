import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── DELETE /api/trips/[id]/personal-activities/[activityId] ──────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; activityId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tripId, activityId } = await params;

  const activity = await prisma.personalActivity.findFirst({
    where: { id: activityId, tripId, userId: session.user.id },
    select: { id: true },
  });

  if (!activity) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.personalActivity.delete({ where: { id: activityId } });

  return new NextResponse(null, { status: 204 });
}
