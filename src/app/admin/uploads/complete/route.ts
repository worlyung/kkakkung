import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { listAlbumChildren } from "@/lib/children";
import {
  createPhotoRecord,
  normalizeCaption,
  normalizeTakenAt,
  validatePositiveInteger,
} from "@/lib/photos";
import { readAlbumSession } from "@/lib/session";
import { deletePrivateObject, privateObjectExists } from "@/lib/storage";
import { verifyUploadToken } from "@/lib/upload-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  uploadToken: z.string().min(1),
  caption: z.string().max(120).nullable().optional(),
  takenAt: z.string().nullable().optional(),
  childIds: z.array(z.string()).optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  originalWidth: z.number().int().positive(),
  originalHeight: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const session = await readAlbumSession("admin");
  if (!session) {
    return NextResponse.json({ error: "다시 로그인해주세요." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "사진 정보를 저장하지 못했어요." }, { status: 400 });
  }

  let upload: Awaited<ReturnType<typeof verifyUploadToken>>;
  try {
    upload = await verifyUploadToken(parsed.data.uploadToken);
  } catch {
    return NextResponse.json({ error: "업로드 시간이 지났어요. 다시 시도해주세요." }, { status: 400 });
  }
  if (upload.albumId !== session.albumId) {
    return NextResponse.json({ error: "다시 로그인해주세요." }, { status: 401 });
  }

  const [originalExists, thumbExists] = await Promise.all([
    privateObjectExists(upload.storageKey),
    privateObjectExists(upload.thumbKey),
  ]);

  if (!originalExists || !thumbExists) {
    await Promise.allSettled([deletePrivateObject(upload.storageKey), deletePrivateObject(upload.thumbKey)]);
    return NextResponse.json({ error: "사진 업로드가 끝나지 않았어요. 다시 시도해주세요." }, { status: 400 });
  }

  // 지정한 아이들이 정말 이 앨범 아이인지 확인. 아닌 건 걸러낸다.
  let childIds: string[] = [];
  if (parsed.data.childIds?.length) {
    const children = await listAlbumChildren(upload.albumId);
    const valid = new Set(children.map((child) => child.id));
    childIds = parsed.data.childIds.filter((id) => valid.has(id));
  }

  try {
    const photo = await createPhotoRecord({
      id: upload.id,
      albumId: upload.albumId,
      childIds,
      storageKey: upload.storageKey,
      thumbKey: upload.thumbKey,
      caption: normalizeCaption(parsed.data.caption ?? null),
      takenAt: normalizeTakenAt(parsed.data.takenAt ?? null),
      width: validatePositiveInteger(parsed.data.width, "가로"),
      height: validatePositiveInteger(parsed.data.height, "세로"),
      originalWidth: validatePositiveInteger(parsed.data.originalWidth, "원본 가로"),
      originalHeight: validatePositiveInteger(parsed.data.originalHeight, "원본 세로"),
      mimeType: upload.mimeType,
      fileSizeBytes: upload.fileSizeBytes,
    });

    return NextResponse.json({ photoId: photo.id });
  } catch (error) {
    await Promise.allSettled([deletePrivateObject(upload.storageKey), deletePrivateObject(upload.thumbKey)]);
    throw error;
  }
}
