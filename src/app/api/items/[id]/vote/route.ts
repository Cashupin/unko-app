import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const voteSchema = z.object({
  value: z.enum(["APPROVE", "REJECT"], {
    error: "value must be APPROVE or REJECT",
  }),
});

// ─── POST /api/items/[id]/vote ─────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: itemId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = voteSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { value } = result.data;
  const userId = session.user.id;

  // Verify item exists and user is a trip member
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, tripId: true },
  });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId: item.tripId, userId },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Upsert vote — idempotent, handles retries and double-submits
  await prisma.vote.upsert({
    where: { userId_itemId: { userId, itemId } },
    create: { userId, itemId, value },
    update: { value },
  });

  // Return updated counts
  const [approvals, rejections] = await Promise.all([
    prisma.vote.count({ where: { itemId, value: "APPROVE" } }),
    prisma.vote.count({ where: { itemId, value: "REJECT" } }),
  ]);

  return NextResponse.json({ approvals, rejections, myVote: value });
}
