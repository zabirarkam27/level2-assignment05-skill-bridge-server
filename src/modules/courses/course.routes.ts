import { Router } from "express";
import auth, { UserRole } from "../../middlewares/auth";
import { CourseController } from "./course.controller";

const router = Router();

router.get("/popular", (req, res) => {
  req.query.popular = "true";
  return CourseController.getAllCourses(req, res);
});

router.get(
  "/mine",
  auth(UserRole.ADMIN, UserRole.TUTOR),
  (req, res) => {
    req.query.mine = "true";
    return CourseController.getAllCourses(req, res);
  },
);

router.get("/", CourseController.getAllCourses);
router.get("/:id", CourseController.getSingleCourse);

router.post(
  "/",
  auth(UserRole.ADMIN, UserRole.TUTOR),
  CourseController.createCourse,
);

router.patch(
  "/:id/popular",
  auth(UserRole.ADMIN),
  CourseController.togglePopular,
);

router.patch(
  "/:id",
  auth(UserRole.ADMIN, UserRole.TUTOR),
  CourseController.updateCourse,
);

router.delete(
  "/:id",
  auth(UserRole.ADMIN, UserRole.TUTOR),
  CourseController.deleteCourse,
);

export const courseRouter = router;
