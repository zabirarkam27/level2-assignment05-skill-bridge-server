import express, { Router } from "express";
import { CategoryController } from "./category.controller";
import auth, { UserRole } from "../../middlewares/auth";
import { uploadSingleImage } from "../../middlewares/imageUpload.middleware";

const router = express.Router();

router.get("/", CategoryController.getAllCategories);
router.get("/:id", CategoryController.getSingleCategory);

router.post("/", auth(UserRole.ADMIN), CategoryController.createCategory);
router.patch("/:id", auth(UserRole.ADMIN), CategoryController.updateCategory);
router.delete("/:id", auth(UserRole.ADMIN), CategoryController.deleteCategory);
router.post(
  "/upload-image",
  auth(UserRole.ADMIN),
  uploadSingleImage("image"),
  CategoryController.uploadCategoryImage,
);

export const categoryRouter: Router = router;
