import { Router } from "express";
import auth, { UserRole } from "../../middlewares/auth";
import { ReviewController } from "./review.controller";

const router = Router();

router.post("/", auth(UserRole.STUDENT), ReviewController.createReview);
router.get("/tutor-me", auth(UserRole.TUTOR), ReviewController.getTutorOwnReviews);
router.get("/tutor/:tutorId", ReviewController.getTutorReviews);
router.get("/student", auth(UserRole.STUDENT), ReviewController.getStudentReviews);

export const reviewRouter = router;