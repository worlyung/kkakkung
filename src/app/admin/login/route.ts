import { NextResponse, type NextRequest } from "next/server";
import { getAlbumBySlug } from "@/lib/albums";
import { normalizePasscode, verifyPasscode } from "@/lib/passcodes";
import { setAlbumSession } from "@/lib/session";
import { normalizeSlug } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectWithError(request: NextRequest, message: string) {
  return NextResponse.redirect(new URL(`/admin?error=${encodeURIComponent(message)}`, request.url), { status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const slug = normalizeSlug(formData.get("slug"));
  const passcode = normalizePasscode(formData.get("passcode"));

  if (!slug || !passcode) {
    return redirectWithError(request, "링크와 암호를 확인해주세요.");
  }

  const album = await getAlbumBySlug(slug);
  if (!album || !(await verifyPasscode(passcode, album.admin_passcode_hash))) {
    return redirectWithError(request, "링크나 암호가 맞지 않아요.");
  }

  await setAlbumSession(album.id, "admin");
  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
