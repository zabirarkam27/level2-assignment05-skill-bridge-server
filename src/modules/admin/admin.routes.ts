import { Router } from "express";
import auth, { UserRole } from "../../middlewares/auth";
import { AdminController } from "./admin.controller";

const router = Router();

router.get("/stats", auth(UserRole.ADMIN), AdminController.getDashboardStats);
router.get("/users", auth(UserRole.ADMIN), AdminController.getAllUsers);
router.get("/users/:id", auth(UserRole.ADMIN), AdminController.getSingleUser);
router.patch("/users/:id", auth(UserRole.ADMIN), AdminController.updateUserStatus);
router.delete("/users/:id", auth(UserRole.ADMIN), AdminController.deleteUser);
router.post("/users/:id/make-mentor", auth(UserRole.ADMIN), AdminController.makeTutor);
router.post("/users/create-mentor", auth(UserRole.ADMIN), AdminController.createTutor);
router.get("/bookings", auth(UserRole.ADMIN), AdminController.getAllBookings);

export const adminRouter = router;