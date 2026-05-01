import { Request, Response } from "express";
import { UploadService } from "./upload.service";

const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }
    const url = await UploadService.uploadImage(req.file.buffer);
    res.status(200).json({ success: true, data: { url } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Image upload failed" });
  }
};

export const UploadController = { uploadImage };
