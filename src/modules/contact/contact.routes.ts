import { Router } from "express";
import auth, { UserRole } from "../../middlewares/auth";
import { ContactController } from "./contact.controller";

const router = Router();

router.post("/", ContactController.createMessage);
router.get("/", auth(UserRole.ADMIN), ContactController.getMessages);
router.patch("/:id/read", auth(UserRole.ADMIN), ContactController.markAsRead);

export const contactRouter = router;
