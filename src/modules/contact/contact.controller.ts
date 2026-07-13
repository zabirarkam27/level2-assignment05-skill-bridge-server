import { Request, Response } from "express";
import { ContactService } from "./contact.service";
import { createContactMessageSchema } from "./contact.validation";

const createMessage = async (req: Request, res: Response) => {
  try {
    const payload = createContactMessageSchema.parse(req.body);
    const result = await ContactService.createMessage(payload);

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to send message";
    res.status(400).json({ success: false, message });
  }
};

const getMessages = async (_req: Request, res: Response) => {
  try {
    const result = await ContactService.getMessages();
    res.status(200).json({ success: true, data: result });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load messages";
    res.status(400).json({ success: false, message });
  }
};

const markAsRead = async (req: Request, res: Response) => {
  try {
    const result = await ContactService.markAsRead(req.params.id as string);
    res.status(200).json({
      success: true,
      message: "Message marked as read",
      data: result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update message";
    res.status(400).json({ success: false, message });
  }
};

export const ContactController = {
  createMessage,
  getMessages,
  markAsRead,
};
