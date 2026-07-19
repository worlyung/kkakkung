import { NextResponse, type NextRequest } from "next/server";
import { getAlbumById, updateAlbumSettings } from "@/lib/albums";
import { readAlbumSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function back(request: NextRequest, message?: string) {
  const url = new URL("/admin", request.url);
  if (message) {
    url.searchParams.set("error", message);
  }
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const session = await readAlbumSession("admin");
  const album = session ? await getAlbumById(session.albumId) : null;
  if (!album) {
    return back(request, "다시 로그인해주세요.");
  }

  const form = await request.formData();
  const op = String(form.get("op") ?? "");

  if (op === "expiry") {
    const days = String(form.get("days") ?? "");
    if (days === "none") {
      await updateAlbumSettings(album.id, { shareExpiresAt: null });
    } else {
      const n = Number(days);
      if (Number.isFinite(n) && n > 0) {
        await updateAlbumSettings(album.id, { shareExpiresAt: new Date(Date.now() + n * 86_400_000).toISOString() });
      }
    }
  } else if (op === "downloads") {
    await updateAlbumSettings(album.id, { downloadsEnabled: String(form.get("value") ?? "") === "on" });
  } else if (op === "name") {
    const name = String(form.get("babyName") ?? "").trim().slice(0, 40);
    if (name) {
      await updateAlbumSettings(album.id, { babyName: name });
    } else {
      return back(request, "앨범 이름을 한 글자 이상 넣어주세요.");
    }
  }

  return back(request);
}
