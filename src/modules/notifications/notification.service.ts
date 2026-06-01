import { NotificationType } from "@prisma/client";
import { prisma } from "../../lib/prisma";

type CreateNotificationPayload = {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  entityId?: string | null;
};

const createNotification = async ({
  userId,
  title,
  message,
  type,
  link,
  entityId,
}: CreateNotificationPayload) => {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      link: link ?? null,
      entityId: entityId ?? null,
    },
  });
};

const createNotifications = async (
  notifications: CreateNotificationPayload[],
) => {
  if (notifications.length === 0) return { count: 0 };

  return prisma.notification.createMany({
    data: notifications.map((notification) => ({
      ...notification,
      link: notification.link ?? null,
      entityId: notification.entityId ?? null,
    })),
  });
};

const notifyAdmins = async (
  payload: Omit<CreateNotificationPayload, "userId">,
) => {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true },
  });

  return createNotifications(
    admins.map((admin) => ({ ...payload, userId: admin.id })),
  );
};

const getMyNotifications = async (userId: string) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
};

const markAsRead = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

const markAllAsRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

const deleteNotification = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  return prisma.notification.delete({ where: { id: notificationId } });
};

export const NotificationService = {
  createNotification,
  createNotifications,
  notifyAdmins,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
