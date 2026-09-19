"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function upsertUserConfig(key: string, value: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.userConfig.upsert({
    where: { userId_key: { userId: session.user.id, key } },
    create: { userId: session.user.id, key, value },
    update: { value },
  });
}
