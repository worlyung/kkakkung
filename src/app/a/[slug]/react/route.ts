import { NextResponse, type NextRequest } from "next/server";
import { getAlbumBySlug } from "@/lib/albums";
import { toggleReaction } from "@/lib/reactions";
import { hasAlbumSession, readViewerIdentity } from "@/lib/session";
import { getAlbumViewer } from "@/lib/viewers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const album = await getAlbumBySlug(slug);

  if (!album || !(await hasAlbumSession(album.id, "viewer"))) {
    return NextResponse.json({ error: "다시 들어와 주세요." }, { status: 401 });
  }

  const viewerId = await readViewerIdentity(album.id);
  const viewer = viewerId ? await getAlbumViewer(album.id, viewerId) : null;
  if (!viewer) {
    return NextResponse.json({ error: "누구신지 먼저 골라주세요." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as { photoId?: string } | null;
  const photoId = typeof payload?.photoId === "string" ? payload.photoId : "";
  if (!photoId) {
    return NextResponse.json({ error: "사진을 찾지 못했어요." }, { status: 400 });
  }

  const result = await toggleReaction(album.id, photoId, viewer.id);
  return NextResponse.json(result);
}
