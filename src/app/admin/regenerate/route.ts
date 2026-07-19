import { NextResponse, type NextRequest } from "next/server";
import { getAlbumById, updateAlbumSlug } from "@/lib/albums";
import { readAlbumSession } from "@/lib/session";
import { createShareSlug } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectWithError(request: NextRequest, message: string) {
  return NextResponse.redirect(new URL(`/admin?error=${encodeURIComponent(message)}`, request.url), { status: 303 });
}

export async function POST(request: NextRequest) {
  const session = await readAlbumSession("admin");
  const album = session ? await getAlbumById(session.albumId) : null;

  if (!album) {
    return redirectWithError(request, "다시 로그인해주세요.");
  }

  await updateAlbumSlug(album.id, createShareSlug());
  return NextResponse.redirect(new URL("/admin?regenerated=1", request.url), { status: 303 });
}
