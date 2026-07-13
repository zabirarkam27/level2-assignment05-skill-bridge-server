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
    cloudinaryFolder: "mentorforge/avatars",
  },
  course: {
    maxWidth: 1200,
    maxHeight: 800,
    quality: 78,
    cloudinaryFolder: "mentorforge/courses",
  },
  category: {
    maxWidth: 900,
    maxHeight: 506,
    quality: 76,
    cloudinaryFolder: "mentorforge/categories",
  },
  general: {
    maxWidth: 1600,
    maxHeight: 1200,
    quality: 78,
    cloudinaryFolder: "mentorforge/uploads",
  },
};

export const IMAGE_PRESET_VALUES = Object.keys(IMAGE_PRESETS) as ImagePreset[];

export function parseImagePreset(value: unknown): ImagePreset {
  if (
    typeof value === "string" &&
    IMAGE_PRESET_VALUES.includes(value as ImagePreset)
  ) {
    return value as ImagePreset;
  }
  return "general";
}
