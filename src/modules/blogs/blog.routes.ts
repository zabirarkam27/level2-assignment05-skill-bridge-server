import { Router } from "express";
import auth, { UserRole } from "../../middlewares/auth";
import { BlogController } from "./blog.controller";

const router = Router();

router.get("/", BlogController.getPublishedBlogs);
router.get("/manage", auth(UserRole.ADMIN, UserRole.TUTOR), BlogController.getManageBlogs);
router.get("/:id", BlogController.getSinglePublishedBlog);
router.post("/", auth(UserRole.ADMIN, UserRole.TUTOR), BlogController.createBlog);
router.patch("/:id", auth(UserRole.ADMIN, UserRole.TUTOR), BlogController.updateBlog);
router.delete("/:id", auth(UserRole.ADMIN, UserRole.TUTOR), BlogController.deleteBlog);

export const blogRouter = router;
