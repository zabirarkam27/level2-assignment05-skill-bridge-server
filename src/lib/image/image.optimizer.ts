import sharp from "sharp";
import { IMAGE_PRESETS, ImagePreset } from "./image.presets";

export type OptimizedImageFormat = "avif" | "webp";

export interface OptimizedImage {
  buffer: Buffer;
  format: OptimizedImageFormat;
  mimeType: string;
  extension: string;
  width: number;
  height: number;
}

/**
 * Resize, compress, and convert to AVIF (preferred) or WebP.
 * Original buffer is never persisted — only the returned optimized buffer.
 */
export async function optimizeImageBuffer(
  input: Buffer,
  preset: ImagePreset,
): Promise<OptimizedImage> {
  const { maxWidth, maxHeight, quality } = IMAGE_PRESETS[preset];

  const base = sharp(input, { failOn: "none", animated: false }).rotate();

  const resized = base.resize({
    width: maxWidth,
    height: maxHeight,
    fit: "inside",
    withoutEnlargement: true,
  });

  const avifResult = await tryEncode(resized.clone(), "avif", quality);
  if (avifResult) return avifResult;

  const webpResult = await tryEncode(resized.clone(), "webp", quality);
  if (webpResult) return webpResult;

  throw new Error("Image optimization failed");
}

async function tryEncode(
  pipeline: sharp.Sharp,
  format: OptimizedImageFormat,
  quality: number,
): Promise<OptimizedImage | null> {
  try {
    const encoder =
      format === "avif"
        ? pipeline.avif({ quality, effort: 4 })
        : pipeline.webp({ quality, effort: 4, alphaQuality: quality });

    const { data, info } = await encoder.toBuffer({ resolveWithObject: true });

    return {
      buffer: data,
      format,
      mimeType: format === "avif" ? "image/avif" : "image/webp",
      extension: format,
      width: info.width,
      height: info.height,
    };
  } catch {
    return null;
  }
}
