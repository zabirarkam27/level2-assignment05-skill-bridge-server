import multer from "multer";
import { Request, Response, NextFunction } from "express";

export const ALLOWED_IMAGE_MIMETYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIMETYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Unsupported image type. Use JPEG, PNG, GIF, WebP, AVIF, BMP, TIFF, or HEIC.",
        ),
      );
    }
  },
});

/** Multer errors → JSON. */
export function handleImageUploadError(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Image must be under 5MB"
        : err.message;
    return res.status(400).json({ success: false, message });
  }

  if (err instanceof Error) {
    return res.status(400).json({ success: false, message: err.message });
  }

  return res.status(400).json({ success: false, message: "Upload failed" });
}

/** Wrap multer.single so validation errors return JSON instead of 500. */
export function uploadSingleImage(fieldName = "image") {
  return (req: Request, res: Response, next: NextFunction) => {
    imageUpload.single(fieldName)(req, res, (err) => {
      if (err) return handleImageUploadError(err, req, res, next);
      next();
    });
  };
}