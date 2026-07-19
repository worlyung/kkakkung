import { NextResponse, type NextRequest } from "next/server";
import { getAlbumById, purgeAllTrash, purgePhoto, restorePhoto, trashPhoto, updateAlbumSettings, updatePhoto } from "@/lib/albums";
import { listAlbumChildren } from "@/lib/children";
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

  if (op === "purgeAll") {
    await purgeAllTrash(album.id);
    return back(request);
  }
  if (op === "uncover") {
    await updateAlbumSettings(album.id, { coverPhotoId: null });
    return back(request);
  }

  const id = String(form.get("id") ?? "");
  if (!id) {
    return back(request);
  }

  if (op === "trash") {
    await trashPhoto(album.id, id);
  } else if (op === "restore") {
    await restorePhoto(album.id, id);
  } else if (op === "purge") {
    await purgePhoto(album.id, id);
  } else if (op === "cover") {
    await updateAlbumSettings(album.id, { coverPhotoId: id });
  } else if (op === "edit") {
    const caption = String(form.get("caption") ?? "").trim() || null;
    const dateRaw = String(form.get("takenAt") ?? "").trim();
    const takenAt = dateRaw ? new Date(dateRaw).toISOString() : null;
    // 체크한 아이들(여러 명 가능)만 남기고 이 앨범 아이인지 확인.
    const rawIds = form.getAll("childId").map((v) => String(v).trim()).filter(Boolean);
    let childIds: string[] = [];
    if (rawIds.length > 0) {
      const children = await listAlbumChildren(album.id);
      const valid = new Set(children.map((child) => child.id));
      childIds = rawIds.filter((cid) => valid.has(cid));
    }
    await updatePhoto(album.id, id, { caption, takenAt, childIds });
  }

  return back(request);
}
