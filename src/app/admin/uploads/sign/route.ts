import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAlbumById } from "@/lib/albums";
import {
  extensionForMimeType,
  isVideoMime,
  MAX_ORIGINAL_PHOTO_BYTES,
  MAX_THUMB_BYTES,
  MAX_VIDEO_BYTES,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
} from "@/lib/photos";
import { readAlbumSession } from "@/lib/session";
import { createPrivateUploadUrl } from "@/lib/storage";
import { createUploadToken } from "@/lib/upload-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  thumbSizeBytes: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const session = await readAlbumSession("admin");
  const album = session ? await getAlbumById(session.albumId) : null;

  if (!album) {
    return NextResponse.json({ error: "다시 로그인해주세요." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "사진 정보를 확인해주세요." }, { status: 400 });
  }

  const { mimeType, fileSizeBytes, thumbSizeBytes } = parsed.data;
  const isVideo = isVideoMime(mimeType);
  if (!SUPPORTED_IMAGE_TYPES.has(mimeType) && !SUPPORTED_VIDEO_TYPES.has(mimeType)) {
    return NextResponse.json({ error: "지원하지 않는 형식이에요." }, { status: 400 });
  }

  if (isVideo) {
    if (fileSizeBytes > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "영상 하나는 100MB 이하로 올려주세요." }, { status: 400 });
    }
  } else if (fileSizeBytes > MAX_ORIGINAL_PHOTO_BYTES) {
    return NextResponse.json({ error: "사진 한 장은 25MB 이하로 올려주세요." }, { status: 400 });
  }

  if (thumbSizeBytes > MAX_THUMB_BYTES) {
    return NextResponse.json({ error: "보기용 사진이 너무 커요. 다시 시도해주세요." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const storageKey = `${album.share_slug}/orig/${id}.${extensionForMimeType(mimeType)}`;
  const thumbKey = `${album.share_slug}/thumb/${id}.webp`;
  const [originalUploadUrl, thumbUploadUrl, uploadToken] = await Promise.all([
    createPrivateUploadUrl(storageKey, mimeType),
    createPrivateUploadUrl(thumbKey, "image/webp"),
    createUploadToken({
      albumId: album.id,
      id,
      storageKey,
      thumbKey,
      mimeType,
      fileSizeBytes,
    }),
  ]);

  return NextResponse.json({
    originalUploadUrl,
    thumbUploadUrl,
    uploadToken,
  });
}
