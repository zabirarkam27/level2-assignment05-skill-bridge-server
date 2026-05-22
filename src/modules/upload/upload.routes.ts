import { Router } from "express";
import auth from "../../middlewares/auth";
import { uploadSingleImage } from "../../middlewares/imageUpload.middleware";
import { UploadController } from "./upload.controller";

const router = Router();

router.post(
  "/image",
  auth(),
  uploadSingleImage("image"),
  UploadController.uploadImage,
);

router.post("/image/from-url", auth(), UploadController.uploadImageFromUrl);

export const uploadRouter = router;
