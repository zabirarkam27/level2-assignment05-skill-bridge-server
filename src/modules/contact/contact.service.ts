import { prisma } from "../../lib/prisma";
import { CreateContactMessagePayload } from "./contact.validation";

const createMessage = async (payload: CreateContactMessagePayload) => {
  return prisma.contactMessage.create({
    data: payload,
  });
};

const getMessages = async () => {
  return prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  });
};

const markAsRead = async (id: string) => {
  return prisma.contactMessage.update({
    where: { id },
    data: { isRead: true },
  });
};

export const ContactService = {
  createMessage,
  getMessages,
  markAsRead,
};
