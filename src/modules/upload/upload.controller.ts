import { Request, Response } from "express";
import { ImageUploadService } from "../../lib/image";

const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const result = await ImageUploadService.fromMulterFile(
      req.file,
      req.body.preset,
    );

    res.status(200).json({
      success: true,
      message: "Image optimized and uploaded",
      data: result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Image upload failed";
    res.status(400).json({ success: false, message });
  }
};

const uploadImageFromUrl = async (req: Request, res: Response) => {
  try {
    const { url, preset } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, message: "Image URL is required" });
    }

    const result = await ImageUploadService.fromUrl(url, preset);

    res.status(200).json({
      success: true,
      message: "Image optimized and uploaded",
      data: result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Image upload failed";
    res.status(400).json({ success: false, message });
  }
};

export const UploadController = { uploadImage, uploadImageFromUrl };
