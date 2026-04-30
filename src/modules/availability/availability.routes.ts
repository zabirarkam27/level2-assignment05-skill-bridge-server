import { Router } from "express";
import auth, { UserRole } from "../../middlewares/auth";
import { AvailabilityController } from "./availability.controller";

const router = Router();

router.post("/", auth(UserRole.TUTOR), AvailabilityController.createAvailability);
router.get("/", auth(UserRole.TUTOR), AvailabilityController.getTutorAvailability);
router.put("/", auth(UserRole.TUTOR), AvailabilityController.updateAvailability);
router.delete("/:id", auth(UserRole.TUTOR), AvailabilityController.deleteAvailability);
router.get("/tutor/:tutorId", AvailabilityController.getPublicTutorAvailability);

export const availabilityRouter = router;