import { NextResponse, type NextRequest } from "next/server";
import { countAlbums } from "@/lib/albums";
import { getInitialSetupKey } from "@/lib/env";
import { hashPasscode, normalizePasscode } from "@/lib/passcodes";
import { setAlbumSession } from "@/lib/session";
import { createShareSlug } from "@/lib/slug";
import { createSupabaseServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectWithError(request: NextRequest, message: string) {
  return NextResponse.redirect(new URL(`/admin/setup?error=${encodeURIComponent(message)}`, request.url), { status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const setupKey = typeof formData.get("setupKey") === "string" ? String(formData.get("setupKey")) : "";
  const expectedSetupKey = getInitialSetupKey();

  if (!expectedSetupKey || setupKey !== expectedSetupKey) {
    return redirectWithError(request, "설정 키가 맞지 않아요.");
  }

  if ((await countAlbums()) > 0) {
    return redirectWithError(request, "이미 앨범이 만들어져 있어요.");
  }

  const babyName = typeof formData.get("babyName") === "string" ? String(formData.get("babyName")).trim() : "";
  const viewerPasscode = normalizePasscode(formData.get("viewerPasscode"));
  const adminPasscode = normalizePasscode(formData.get("adminPasscode"));

  if (babyName.length === 0 || babyName.length > 80) {
    return redirectWithError(request, "앨범 이름을 1~80자로 입력해주세요.");
  }

  if (!viewerPasscode || !adminPasscode) {
    return redirectWithError(request, "암호는 숫자 4자리여야 해요.");
  }

  if (viewerPasscode === adminPasscode) {
    return redirectWithError(request, "가족용 암호와 부모용 암호는 다르게 해주세요.");
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("albums")
    .insert({
      baby_name: babyName,
      share_slug: createShareSlug(),
      viewer_passcode_hash: await hashPasscode(viewerPasscode),
      admin_passcode_hash: await hashPasscode(adminPasscode),
    })
    .select("*")
    .single();

  if (error || !data) {
    return redirectWithError(request, "앨범을 만들지 못했어요.");
  }

  await setAlbumSession(data.id, "admin");
  return NextResponse.redirect(new URL("/admin?created=1", request.url), { status: 303 });
}
