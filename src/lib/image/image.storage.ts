import { randomUUID } from "crypto";
import cloudinary from "../cloudinary";
import type { OptimizedImage } from "./image.optimizer";

/**
 * Upload only the optimized image buffer to Cloudinary (never the original file).
 */
export function uploadOptimizedToCloudinary(
  optimized: OptimizedImage,
  folder: string,
): Promise<string> {
  const publicId = randomUUID();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        format: optimized.format,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result.secure_url);
      },
    );

    stream.end(optimized.buffer);
  });
}
