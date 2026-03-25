import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/supabase-broadcast";
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
  const notification = await prisma.notification.create({
    data: { userId, type, title, body: body ?? null, link: link ?? null },
    select: { id: true, type: true, title: true, body: true, link: true, isRead: true, createdAt: true },
  });
  broadcast(`notifications:${userId}`, "new_notification", {
    ...notification,
    createdAt: notification.createdAt.toISOString(),
  });
  return notification;
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
  await prisma.notification.createMany({
    data: notifications.map((n) => ({
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
    })),
  });
  // Broadcast a cada usuario afectado
  for (const n of notifications) {
    broadcast(`notifications:${n.userId}`, "new_notification", {
      id: crypto.randomUUID(),
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }
}
