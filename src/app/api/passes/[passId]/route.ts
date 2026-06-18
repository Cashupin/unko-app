import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";

const CURRENCIES = ["CLP", "JPY", "USD", "EUR", "GBP", "KRW", "CNY", "THB"] as const;

const updatePassSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  validFrom: z.string().nullable().optional(),
  validTo: z.string().nullable().optional(),
  cost: z.number().positive().nullable().optional(),
  currency: z.enum(CURRENCIES).optional(),
  isPaid: z.boolean().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

const PASS_SELECT = {
  id: true, name: true, validFrom: true, validTo: true,
  cost: true, currency: true, isPaid: true, notes: true, createdAt: true,
  transports: { select: { id: true } },
} as const;

async function requireEditorForPass(passId: string, userId: string) {
  const pass = await prisma.pass.findUnique({
    where: { id: passId },
    select: { tripId: true },
  });
  if (!pass) return null;
  const membership = await prisma.tripParticipant.findFirst({
    where: { tripId: pass.tripId, userId },
    select: { role: true },
  });
  if (!membership || membership.role === "VIEWER") return null;
  return pass;
}

// ─── PATCH /api/passes/[passId] ───────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ passId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { passId } = await params;
  const pass = await requireEditorForPass(passId, session.user.id);
  if (!pass) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = updatePassSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { name, validFrom, validTo, cost, currency, isPaid, notes } = result.data;

  const updated = await prisma.pass.update({
    where: { id: passId },
    data: {
      ...(name !== undefined && { name }),
      ...(validFrom !== undefined && { validFrom: validFrom ? new Date(validFrom) : null }),
      ...(validTo !== undefined && { validTo: validTo ? new Date(validTo) : null }),
      ...(cost !== undefined && { cost }),
      ...(currency !== undefined && { currency }),
      ...(isPaid !== undefined && { isPaid }),
      ...(notes !== undefined && { notes }),
    },
    select: PASS_SELECT,
  });

  broadcast(`trip:${pass.tripId}`, "update");
  return NextResponse.json(updated);
}

// ─── DELETE /api/passes/[passId] ──────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ passId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { passId } = await params;
  const pass = await requireEditorForPass(passId, session.user.id);
  if (!pass) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.pass.delete({ where: { id: passId } });

  broadcast(`trip:${pass.tripId}`, "update");
  return new NextResponse(null, { status: 204 });
}
