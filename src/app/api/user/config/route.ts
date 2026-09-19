import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  const rows = await prisma.userConfig.findMany({
    where: { userId: session.user.id },
    select: { key: true, value: true },
  });

  const configs = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return NextResponse.json(configs);
}
