import type { Photo } from "@/types/database";
import { createSupabaseServiceClient } from "./supabase";

export const MAX_ORIGINAL_PHOTO_BYTES = 25 * 1024 * 1024;
export const MAX_THUMB_BYTES = 3 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);
export const SUPPORTED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

export function isVideoMime(mimeType: string): boolean {
  return SUPPORTED_VIDEO_TYPES.has(mimeType);
}

export function normalizeCaption(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const caption = value.trim();
  return caption ? caption.slice(0, 120) : null;
}

export function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    case "video/mp4":
      return "mp4";
    case "video/quicktime":
      return "mov";
    case "video/webm":
      return "webm";
    default:
      return "bin";
  }
}

export function normalizeTakenAt(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function validatePositiveInteger(value: unknown, fallbackName: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${fallbackName} 값이 올바르지 않아요.`);
  }

  return value;
}

export async function createPhotoRecord(input: {
  id: string;
  albumId: string;
  childIds: string[];
  storageKey: string;
  thumbKey: string;
  caption: string | null;
  takenAt: string | null;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  mimeType: string;
  fileSizeBytes: number;
}): Promise<Photo> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("photos")
    .insert({
      id: input.id,
      album_id: input.albumId,
      // child_id는 하위호환용(첫 아이), child_ids가 실제 태그 목록.
      child_id: input.childIds[0] ?? null,
      child_ids: input.childIds,
      storage_key: input.storageKey,
      thumb_key: input.thumbKey,
      caption: input.caption,
      taken_at: input.takenAt,
      width: input.width,
      height: input.height,
      original_width: input.originalWidth,
      original_height: input.originalHeight,
      mime_type: input.mimeType,
      file_size_bytes: input.fileSizeBytes,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error("사진 정보를 저장하지 못했어요.");
  }

  return data;
}
