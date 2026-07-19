import { NextResponse, type NextRequest } from "next/server";
import { getAlbumBySlug } from "@/lib/albums";
import { addComment } from "@/lib/comments";
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

  const payload = (await request.json().catch(() => null)) as { photoId?: string; body?: string } | null;
  const photoId = typeof payload?.photoId === "string" ? payload.photoId : "";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";

  if (!photoId || body.length < 1 || body.length > 300) {
    return NextResponse.json({ error: "한마디는 1~300자로 남겨주세요." }, { status: 400 });
  }

  const comment = await addComment(album.id, photoId, viewer.id, body);
  return NextResponse.json({ comment });
}
