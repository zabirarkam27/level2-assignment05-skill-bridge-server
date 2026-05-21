export type ImagePreset = "avatar" | "course" | "category" | "general";

export interface ImagePresetConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  cloudinaryFolder: string;
}

export const IMAGE_PRESETS: Record<ImagePreset, ImagePresetConfig> = {
  avatar: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 82,
    cloudinaryFolder: "skill-bridge/avatars",
  },
  course: {
    maxWidth: 1200,
    maxHeight: 800,
    quality: 78,
    cloudinaryFolder: "skill-bridge/courses",
  },
  category: {
    maxWidth: 1200,
    maxHeight: 675,
    quality: 78,
    cloudinaryFolder: "skill-bridge/categories",
  },
  general: {
    maxWidth: 1600,
    maxHeight: 1200,
    quality: 78,
    cloudinaryFolder: "skill-bridge/uploads",
  },
};

export const IMAGE_PRESET_VALUES = Object.keys(IMAGE_PRESETS) as ImagePreset[];

export function parseImagePreset(value: unknown): ImagePreset {
  if (typeof value === "string" && IMAGE_PRESET_VALUES.includes(value as ImagePreset)) {
    return value as ImagePreset;
  }
  return "general";
}
