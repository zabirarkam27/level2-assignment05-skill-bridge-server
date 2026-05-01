import { Router } from "express";
import multer from "multer";
import auth from "../../middlewares/auth";
import { UploadController } from "./upload.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
    }
  },
});

router.post(
  "/image",
  auth(),
  upload.single("image"),
  UploadController.uploadImage,
);

export const uploadRouter = router;
