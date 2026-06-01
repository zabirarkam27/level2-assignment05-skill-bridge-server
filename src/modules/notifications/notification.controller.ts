import { Request, Response } from "express";
import { getHttpStatusFromMessage } from "../../utils/httpStatus";
import { NotificationService } from "./notification.service";

const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const result = await NotificationService.getMyNotifications(userId);

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const rawId = req.params.id;
    const notificationId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!userId || !notificationId) {
      throw new Error("Unauthorized or invalid request");
    }

    const result = await NotificationService.markAsRead(
      notificationId,
      userId,
    );

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const result = await NotificationService.markAllAsRead(userId);

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const rawId = req.params.id;
    const notificationId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!userId || !notificationId) {
      throw new Error("Unauthorized or invalid request");
    }

    const result = await NotificationService.deleteNotification(
      notificationId,
      userId,
    );

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

export const NotificationController = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
