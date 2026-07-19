import { NextResponse, type NextRequest } from "next/server";
import { getAlbumBySlug } from "@/lib/albums";
import { hasAlbumSession, setViewerIdentity } from "@/lib/session";
import { getAlbumViewer, touchViewer } from "@/lib/viewers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const album = await getAlbumBySlug(slug);

  if (!album || !(await hasAlbumSession(album.id, "viewer"))) {
    return NextResponse.redirect(new URL(`/a/${slug}`, request.url), { status: 303 });
  }

  const formData = await request.formData();
  const viewerId = typeof formData.get("viewerId") === "string" ? String(formData.get("viewerId")) : "";
  const viewer = viewerId ? await getAlbumViewer(album.id, viewerId) : null;

  if (!viewer) {
    return NextResponse.redirect(new URL(`/a/${album.share_slug}`, request.url), { status: 303 });
  }

  await setViewerIdentity(album.id, viewer.id);
  await touchViewer(viewer.id);
  return NextResponse.redirect(new URL(`/a/${album.share_slug}`, request.url), { status: 303 });
}
