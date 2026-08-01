import { NextResponse, type NextRequest } from "next/server";
import { getAlbumBySlug } from "@/lib/albums";
import { hasAlbumSession, readViewerIdentity } from "@/lib/session";
import { markRepliesChecked } from "@/lib/viewers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

// 새 답글 알림을 확인했다는 표시. 다음 방문부터는 그 이후 답글만 알려준다.
export async function POST(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const album = await getAlbumBySlug(slug);

  if (!album || !(await hasAlbumSession(album.id, "viewer"))) {
    return NextResponse.json({ error: "다시 들어와 주세요." }, { status: 401 });
  }

  const viewerId = await readViewerIdentity(album.id);
  if (!viewerId) {
    return NextResponse.json({ error: "누구신지 먼저 골라주세요." }, { status: 403 });
  }

  await markRepliesChecked(album.id, viewerId);
  return NextResponse.json({ ok: true });
}
