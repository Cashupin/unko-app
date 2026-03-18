import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { expenseId } = await params;

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: {
      shareToken: true,
      trip: { select: { isStandaloneGroup: true, createdById: true } },
    },
  });

  if (!expense?.trip?.isStandaloneGroup || expense.trip.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = expense.shareToken ?? randomBytes(16).toString("hex");

  if (!expense.shareToken) {
    await prisma.expense.update({
      where: { id: expenseId },
      data: { shareToken: token },
    });
  }

  return NextResponse.json({ token });
}
