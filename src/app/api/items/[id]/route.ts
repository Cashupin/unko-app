import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteCloudinaryImage } from "@/lib/cloudinary";
import { broadcast } from "@/lib/supabase-broadcast";

// ─── PATCH /api/items/[id] ─────────────────────────────────────────────────────

const patchSchema = z.object({
  title: z.string().trim().min(1).max(255),
  type: z.enum(["PLACE", "FOOD"]),
  description: z.string().trim().max(1000).nullable().optional(),
  location: z.string().trim().max(500).nullable().optional(),
  locationLat: z.number().nullable().optional(),
  locationLng: z.number().nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  externalUrl: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  imageUrl: z.string().url().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: itemId } = await params;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      tripId: true,
      createdById: true,
      imageUrl: true,
      votes: { select: { userId: true } },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  }

  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId: item.tripId, userId: session.user.id },
    select: { role: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isCreator = item.createdById === session.user.id;
  const isAdmin = membership.role === "ADMIN";
  const otherVoteCount = item.votes.filter((v) => v.userId !== item.createdById).length;
  const canEdit = (isCreator && otherVoteCount === 0) || isAdmin;

  if (!canEdit) {
    return NextResponse.json(
      { error: "No puedes editar este ítem. Ya tiene votos de otros participantes." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { title, type, description, location, locationLat, locationLng, address, externalUrl, imageUrl } = result.data;

  // If image changed, delete old one from Cloudinary
  if (imageUrl !== item.imageUrl) {
    void deleteCloudinaryImage(item.imageUrl);
  }

  const updated = await prisma.item.update({
    where: { id: itemId },
    data: {
      title,
      type,
      description: description ?? null,
      location: location ?? null,
      locationLat: locationLat ?? null,
      locationLng: locationLng ?? null,
      address: address ?? null,
      externalUrl: externalUrl ?? null,
      imageUrl: imageUrl ?? null,
    },
    select: { id: true, title: true, updatedAt: true },
  });

  broadcast(`trip:${item.tripId}`, "update");
  return NextResponse.json(updated);
}

// ─── DELETE /api/items/[id] ────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: itemId } = await params;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, tripId: true, createdById: true, imageUrl: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  }

  // Check membership in trip
  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId: item.tripId, userId: session.user.id },
    select: { role: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only creator or ADMIN can delete
  const isCreator = item.createdById === session.user.id;
  const isAdmin = membership.role === "ADMIN";

  if (!isCreator && !isAdmin) {
    return NextResponse.json({ error: "Solo el creador o un admin puede eliminar este ítem" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { itemId } }),
    prisma.check.deleteMany({ where: { itemId } }),
    prisma.item.delete({ where: { id: itemId } }),
  ]);
  void deleteCloudinaryImage(item.imageUrl);
  broadcast(`trip:${item.tripId}`, "update");
  return new NextResponse(null, { status: 204 });
}
