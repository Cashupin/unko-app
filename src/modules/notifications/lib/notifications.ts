import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/client";

export async function createNotification({
  userId,
  type,
  title,
  body,
  link,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  return prisma.notification.create({
    data: { userId, type, title, body: body ?? null, link: link ?? null },
  });
}

export async function createNotificationMany(
  notifications: {
    userId: string;
    type: NotificationType;
    title: string;
    body?: string;
    link?: string;
  }[],
) {
  if (notifications.length === 0) return;
  return prisma.notification.createMany({
    data: notifications.map((n) => ({
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
    })),
  });
}
