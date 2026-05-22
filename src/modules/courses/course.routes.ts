import { Router } from "express";
import auth, { UserRole } from "../../middlewares/auth";
import { CourseController } from "./course.controller";

const router = Router();

router.get("/popular", CourseController.getPopularCourses);
router.get(
  "/delete-requests",
  auth(UserRole.ADMIN),
  CourseController.getDeleteRequests,
);

router.get("/mine", auth(UserRole.ADMIN, UserRole.TUTOR), (req, res) => {
  req.query.mine = "true";
  return CourseController.getAllCourses(req, res);
});

router.patch(
  "/delete-requests/:id",
  auth(UserRole.ADMIN),
  CourseController.resolveDeleteRequest,
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

router.post(
  "/:id/delete-request",
  auth(UserRole.TUTOR),
  CourseController.requestCourseDelete,
);

export const courseRouter = router;
