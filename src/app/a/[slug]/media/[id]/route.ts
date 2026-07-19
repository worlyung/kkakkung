import { NextResponse } from "next/server";
import { getAlbumBySlug, listAlbumPhotos } from "@/lib/albums";
import { isVideoMime } from "@/lib/photos";
import { hasAlbumSession } from "@/lib/session";
import { getPrivateObjectBody } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 공유(자랑하기)용 사진/영상 프록시. R2 서명 링크는 브라우저 fetch가 CORS로 막히므로,
// 서버가 대신 읽어 같은 출처(same-origin)로 내려준다. 앨범 세션이 있어야 접근 가능.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  // 백업은 원본 화질(?full=1), 공유는 가벼운 썸네일.
  const full = new URL(req.url).searchParams.get("full") === "1";

  const album = await getAlbumBySlug(slug);
  if (!album) {
    return new NextResponse("앨범을 찾을 수 없어요.", { status: 404 });
  }

  const [viewer, admin] = await Promise.all([
    hasAlbumSession(album.id, "viewer"),
    hasAlbumSession(album.id, "admin"),
  ]);
  if (!viewer && !admin) {
    return new NextResponse("권한이 없어요.", { status: 401 });
  }

  const photos = await listAlbumPhotos(album.id);
  const photo = photos.find((item) => item.id === id);
  if (!photo) {
    return new NextResponse("사진을 찾을 수 없어요.", { status: 404 });
  }

  // 공유는 가벼운 썸네일(사진), 백업(?full=1)이나 영상은 원본을 내려준다.
  const isVideo = isVideoMime(photo.mime_type);
  const useOriginal = isVideo || full;
  const key = useOriginal ? photo.storage_key : photo.thumb_key;
  const { body, contentType, contentLength } = await getPrivateObjectBody(key);

  const headers: Record<string, string> = {
    "Content-Type": useOriginal ? photo.mime_type : contentType ?? "image/webp",
    "Cache-Control": "private, max-age=3600",
  };
  if (contentLength != null) {
    headers["Content-Length"] = String(contentLength);
  }

  return new NextResponse(body, { headers });
}
