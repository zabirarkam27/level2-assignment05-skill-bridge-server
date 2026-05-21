import axios from "axios";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { optimizeImageBuffer } from "./image.optimizer";
import { uploadOptimizedToCloudinary } from "./image.storage";
import { IMAGE_PRESETS, ImagePreset, parseImagePreset } from "./image.presets";

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const ALLOWED_REMOTE_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_REMOTE_CONTENT_TYPES = new Set([
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

export interface UploadImageResult {
  url: string;
  format: "avif" | "webp";
  width: number;
  height: number;
}

async function processAndStore(
  buffer: Buffer,
  preset: ImagePreset,
): Promise<UploadImageResult> {
  if (buffer.length > MAX_SOURCE_BYTES) {
    throw new Error("Image must be under 5MB before optimization");
  }

  const optimized = await optimizeImageBuffer(buffer, preset);
  const folder = IMAGE_PRESETS[preset].cloudinaryFolder;
  const url = await uploadOptimizedToCloudinary(optimized, folder);

  return {
    url,
    format: optimized.format,
    width: optimized.width,
    height: optimized.height,
  };
}

function isPrivateIPv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const first = parts[0]!;
  const second = parts[1]!;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first === 0
  );
}

function isPrivateIPv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

function isPrivateAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return isPrivateIPv4(address);
  if (family === 6) return isPrivateIPv6(address);
  return true;
}

async function validateRemoteImageUrl(input: string): Promise<string> {
  let parsed: URL;

  try {
    parsed = new URL(input);
  } catch {
    throw new Error("Invalid image URL");
  }

  if (!ALLOWED_REMOTE_PROTOCOLS.has(parsed.protocol)) {
    throw new Error("Image URL must use HTTP or HTTPS");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Local image URLs are not allowed");
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateAddress(address))
  ) {
    throw new Error("Private or local image URLs are not allowed");
  }

  return parsed.toString();
}

function assertRemoteImageContentType(contentType: unknown): void {
  const value = Array.isArray(contentType) ? contentType[0] : contentType;
  const mimeType =
    typeof value === "string"
      ? (value.split(";")[0] ?? "").trim().toLowerCase()
      : "";

  if (!ALLOWED_REMOTE_CONTENT_TYPES.has(mimeType)) {
    throw new Error("Remote URL must return a supported image type");
  }
}

export const ImageUploadService = {
  async fromMulterFile(
    file: Express.Multer.File,
    presetInput?: unknown,
  ): Promise<UploadImageResult> {
    const preset = parseImagePreset(presetInput);
    return processAndStore(file.buffer, preset);
  },

  async fromUrl(
    url: string,
    presetInput?: unknown,
  ): Promise<UploadImageResult> {
    const preset = parseImagePreset(presetInput);
    const safeUrl = await validateRemoteImageUrl(url);

    const response = await axios.get(safeUrl, {
      responseType: "arraybuffer",
      maxContentLength: MAX_SOURCE_BYTES,
      maxBodyLength: MAX_SOURCE_BYTES,
      timeout: 15000,
      validateStatus: (s) => s === 200,
    });

    assertRemoteImageContentType(response.headers["content-type"]);

    return processAndStore(Buffer.from(response.data), preset);
  },

  async fromBuffer(
    buffer: Buffer,
    presetInput?: unknown,
  ): Promise<UploadImageResult> {
    const preset = parseImagePreset(presetInput);
    return processAndStore(buffer, preset);
  },
};
