import { NextResponse, type NextRequest } from "next/server";
import { getAlbumBySlug } from "@/lib/albums";
import { normalizePasscode, verifyPasscode } from "@/lib/passcodes";
import { setAlbumSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function redirectWithError(request: NextRequest, slug: string, message: string) {
  return NextResponse.redirect(new URL(`/a/${slug}?error=${encodeURIComponent(message)}`, request.url), { status: 303 });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const formData = await request.formData();
  const passcode = normalizePasscode(formData.get("passcode"));

  if (!passcode) {
    return redirectWithError(request, slug, "암호는 숫자 4자리예요.");
  }

  const album = await getAlbumBySlug(slug);
  if (!album || !(await verifyPasscode(passcode, album.viewer_passcode_hash))) {
    return redirectWithError(request, slug, "암호가 맞지 않아요.");
  }

  await setAlbumSession(album.id, "viewer");
  return NextResponse.redirect(new URL(`/a/${album.share_slug}`, request.url), { status: 303 });
}
