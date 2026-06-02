import { Router } from "express";
import auth, { UserRole } from "../../middlewares/auth";
import { WishlistController } from "./wishlist.controller";

const router = Router();

router.get("/", auth(UserRole.STUDENT), WishlistController.getWishlist);
router.post("/course/:courseId", auth(UserRole.STUDENT), WishlistController.addCourse);
router.post("/tutor/:tutorId", auth(UserRole.STUDENT), WishlistController.addTutor);
router.delete("/course/:courseId", auth(UserRole.STUDENT), WishlistController.removeCourse);
router.delete("/tutor/:tutorId", auth(UserRole.STUDENT), WishlistController.removeTutor);

export const wishlistRouter = router;
