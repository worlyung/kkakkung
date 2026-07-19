import type { Album, Photo } from "@/types/database";
import { deletePrivateObject } from "./storage";
import { createSupabaseServiceClient } from "./supabase";

function sortByTakenAt(rows: Photo[]): Photo[] {
  return [...rows].sort((left, right) => {
    const leftTime = new Date(left.taken_at ?? left.uploaded_at).getTime();
    const rightTime = new Date(right.taken_at ?? right.uploaded_at).getTime();
    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }
    return new Date(right.uploaded_at).getTime() - new Date(left.uploaded_at).getTime();
  });
}

export async function getAlbumBySlug(slug: string): Promise<Album | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("albums").select("*").eq("share_slug", slug).maybeSingle();

  if (error) {
    throw new Error("앨범을 불러오지 못했어요.");
  }

  return data;
}

export async function getAlbumById(id: string): Promise<Album | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("albums").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error("앨범을 불러오지 못했어요.");
  }

  return data;
}

export async function countAlbums(): Promise<number> {
  const supabase = createSupabaseServiceClient();
  const { count, error } = await supabase.from("albums").select("id", { count: "exact", head: true });

  if (error) {
    throw new Error("앨범 상태를 확인하지 못했어요.");
  }

  return count ?? 0;
}

export async function listAlbumPhotos(albumId: string): Promise<Photo[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("photos").select("*").eq("album_id", albumId).is("deleted_at", null);

  if (error) {
    throw new Error("사진을 불러오지 못했어요.");
  }

  return sortByTakenAt(data ?? []);
}

// 휴지통 — 지운 사진들 (최근에 지운 것부터)
export async function listDeletedPhotos(albumId: string): Promise<Photo[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("album_id", albumId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    throw new Error("휴지통을 불러오지 못했어요.");
  }

  return data ?? [];
}

export async function updatePhoto(
  albumId: string,
  photoId: string,
  fields: { caption: string | null; takenAt: string | null; childIds: string[] },
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("photos")
    .update({
      caption: fields.caption,
      taken_at: fields.takenAt,
      child_id: fields.childIds[0] ?? null,
      child_ids: fields.childIds,
    })
    .eq("id", photoId)
    .eq("album_id", albumId);
  if (error) {
    throw new Error("사진 정보를 고치지 못했어요.");
  }
}

export async function trashPhoto(albumId: string, photoId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("photos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", photoId)
    .eq("album_id", albumId);
  if (error) {
    throw new Error("사진을 휴지통으로 옮기지 못했어요.");
  }
}

export async function restorePhoto(albumId: string, photoId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("photos").update({ deleted_at: null }).eq("id", photoId).eq("album_id", albumId);
  if (error) {
    throw new Error("사진을 되살리지 못했어요.");
  }
}

// 휴지통 비우기 — 지운 사진 전부를 완전 삭제(DB + 저장소). 되돌릴 수 없다.
export async function purgeAllTrash(albumId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("photos")
    .select("storage_key, thumb_key")
    .eq("album_id", albumId)
    .not("deleted_at", "is", null);

  const rows = data ?? [];
  await Promise.allSettled(rows.flatMap((row) => [deletePrivateObject(row.storage_key), deletePrivateObject(row.thumb_key)]));

  const { error } = await supabase.from("photos").delete().eq("album_id", albumId).not("deleted_at", "is", null);
  if (error) {
    throw new Error("휴지통을 비우지 못했어요.");
  }
}

// 완전 삭제 — DB 기록과 저장소 파일(원본+축소본)까지 지운다. 되돌릴 수 없다.
export async function purgePhoto(albumId: string, photoId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { data: photo } = await supabase
    .from("photos")
    .select("storage_key, thumb_key")
    .eq("id", photoId)
    .eq("album_id", albumId)
    .maybeSingle();

  if (!photo) {
    return;
  }

  await Promise.allSettled([deletePrivateObject(photo.storage_key), deletePrivateObject(photo.thumb_key)]);
  const { error } = await supabase.from("photos").delete().eq("id", photoId).eq("album_id", albumId);
  if (error) {
    throw new Error("사진을 완전히 지우지 못했어요.");
  }
}

export async function updateAlbumSettings(
  albumId: string,
  fields: { shareExpiresAt?: string | null; downloadsEnabled?: boolean; coverPhotoId?: string | null; babyName?: string },
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const update: {
    share_expires_at?: string | null;
    downloads_enabled?: boolean;
    cover_photo_id?: string | null;
    baby_name?: string;
  } = {};
  if ("shareExpiresAt" in fields) {
    update.share_expires_at = fields.shareExpiresAt ?? null;
  }
  if ("downloadsEnabled" in fields) {
    update.downloads_enabled = Boolean(fields.downloadsEnabled);
  }
  if ("coverPhotoId" in fields) {
    update.cover_photo_id = fields.coverPhotoId ?? null;
  }
  if ("babyName" in fields && fields.babyName) {
    update.baby_name = fields.babyName;
  }
  const { error } = await supabase.from("albums").update(update).eq("id", albumId);
  if (error) {
    throw new Error("설정을 저장하지 못했어요.");
  }
}

export async function updateAlbumSlug(albumId: string, shareSlug: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("albums").update({ share_slug: shareSlug }).eq("id", albumId);

  if (error) {
    throw new Error("링크를 새로 만들지 못했어요.");
  }
}
