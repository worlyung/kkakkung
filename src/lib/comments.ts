import { createSupabaseServiceClient } from "./supabase";

export type PhotoComment = {
  id: string;
  photoId: string;
  parentId: string | null;
  viewerId: string;
  name: string;
  body: string;
  createdAt: string;
};

// 앨범 안 모든 사진의 한마디를 한 번에 불러온다 (사진id -> 한마디 목록).
export async function listAlbumComments(albumId: string): Promise<Map<string, PhotoComment[]>> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, body, created_at, photo_id, parent_id, viewer_id, photos!inner(album_id), viewers(name)")
    .eq("photos.album_id", albumId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("한마디를 불러오지 못했어요.");
  }

  const byPhoto = new Map<string, PhotoComment[]>();
  for (const row of data ?? []) {
    const viewer = row.viewers as { name: string } | { name: string }[] | null;
    const name = Array.isArray(viewer) ? viewer[0]?.name : viewer?.name;
    const comment: PhotoComment = {
      id: row.id,
      photoId: row.photo_id,
      parentId: row.parent_id ?? null,
      viewerId: row.viewer_id,
      name: name ?? "가족",
      body: row.body,
      createdAt: row.created_at,
    };
    const list = byPhoto.get(row.photo_id);
    if (list) {
      list.push(comment);
    } else {
      byPhoto.set(row.photo_id, [comment]);
    }
  }

  return byPhoto;
}

// 한마디 추가. photoId가 정말 이 앨범 사진인지 확인한 뒤 넣는다.
// parentId가 있으면 그 한마디에 대한 답글. 답글의 답글은 원 한마디에 붙인다(한 단계만).
export async function addComment(
  albumId: string,
  photoId: string,
  viewerId: string,
  body: string,
  parentId?: string | null,
): Promise<PhotoComment> {
  const supabase = createSupabaseServiceClient();

  const { data: photo } = await supabase.from("photos").select("id").eq("id", photoId).eq("album_id", albumId).maybeSingle();
  if (!photo) {
    throw new Error("사진을 찾지 못했어요.");
  }

  let resolvedParentId: string | null = null;
  if (parentId) {
    const { data: parent } = await supabase
      .from("comments")
      .select("id, parent_id")
      .eq("id", parentId)
      .eq("photo_id", photoId)
      .maybeSingle();
    if (!parent) {
      throw new Error("답글을 달 한마디를 찾지 못했어요.");
    }
    resolvedParentId = parent.parent_id ?? parent.id;
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ photo_id: photoId, viewer_id: viewerId, body, parent_id: resolvedParentId })
    .select("id, body, created_at, photo_id, parent_id, viewer_id, viewers(name)")
    .single();

  if (error || !data) {
    throw new Error("한마디를 남기지 못했어요.");
  }

  const viewer = data.viewers as { name: string } | { name: string }[] | null;
  const name = Array.isArray(viewer) ? viewer[0]?.name : viewer?.name;
  return {
    id: data.id,
    photoId: data.photo_id,
    parentId: data.parent_id ?? null,
    viewerId: data.viewer_id,
    name: name ?? "가족",
    body: data.body,
    createdAt: data.created_at,
  };
}
