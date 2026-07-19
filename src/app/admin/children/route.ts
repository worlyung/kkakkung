import { NextResponse, type NextRequest } from "next/server";
import { getAlbumById } from "@/lib/albums";
import { addChild, deleteChild, updateChild } from "@/lib/children";
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
  const op = String(form.get("op") ?? "add");

  if (op === "delete") {
    const id = String(form.get("id") ?? "");
    if (id) {
      await deleteChild(album.id, id);
    }
    return back(request);
  }

  const name = String(form.get("name") ?? "").trim();
  const birthdate = String(form.get("birthdate") ?? "").trim() || null;
  if (name.length < 1 || name.length > 40) {
    return back(request, "아이 이름을 1~40자로 넣어주세요.");
  }

  if (op === "edit") {
    const id = String(form.get("id") ?? "");
    if (id) {
      await updateChild(album.id, id, name, birthdate);
    }
    return back(request);
  }

  await addChild(album.id, name, birthdate);
  return back(request);
}
