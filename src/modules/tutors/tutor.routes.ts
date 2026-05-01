import { Router } from "express";
import auth from "../../middlewares/auth";
import { TutorController } from "./tutor.controller";
import { UserRole } from "../../middlewares/auth";

const router = Router();

// Public
router.get("/", TutorController.getAllTutors);
router.get("/profile/me", auth(UserRole.TUTOR), TutorController.getTutorProfile);
router.get("/:id", TutorController.getSingleTutor);
router.get("/:id/reviews", TutorController.getTutorReviews);
router.get("/:id/availability", TutorController.getTutorAvailability);

router.post(
  "/profile",
  auth(UserRole.TUTOR),
  TutorController.createTutor
);

router.put(
  "/profile",
  auth(UserRole.TUTOR),
  TutorController.updateTutor
);

export const tutorRouter = router;