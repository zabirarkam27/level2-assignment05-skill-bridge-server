import { Router } from "express";
import auth from "../../middlewares/auth";
import { NotificationController } from "./notification.controller";

const router = Router();

router.get("/", auth(), NotificationController.getMyNotifications);
router.patch("/read-all", auth(), NotificationController.markAllAsRead);
router.patch("/:id/read", auth(), NotificationController.markAsRead);
router.delete("/:id", auth(), NotificationController.deleteNotification);

export const notificationRouter = router;
