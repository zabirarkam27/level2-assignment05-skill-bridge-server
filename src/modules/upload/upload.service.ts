import cloudinary from "../../lib/cloudinary";

const uploadImage = (fileBuffer: Buffer, folder = "skill-bridge/avatars"): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error("Upload failed"));
        resolve(result.secure_url);
      },
    );
    stream.end(fileBuffer);
  });
};

export const UploadService = { uploadImage };
