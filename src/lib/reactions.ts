import { createSupabaseServiceClient } from "./supabase";

// 사진별 하트 개수 (앨범 안 전체)
// PostgREST 관계 임베드를 피하려고 2단계로: 앨범 사진 id들 먼저 -> 그 사진들의 반응.
export async function listAlbumReactionCounts(albumId: string): Promise<Map<string, number>> {
  const supabase = createSupabaseServiceClient();
  const { data: photos, error: photoError } = await supabase.from("photos").select("id").eq("album_id", albumId);
  if (photoError) {
    throw new Error("반응을 불러오지 못했어요.");
  }
  const ids = (photos ?? []).map((row) => row.id);
  if (ids.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.from("reactions").select("photo_id").in("photo_id", ids);
  if (error) {
    throw new Error("반응을 불러오지 못했어요.");
  }
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.photo_id, (counts.get(row.photo_id) ?? 0) + 1);
  }
  return counts;
}

// 이 사람이 하트 누른 사진들. 보는사람은 한 앨범에만 속하므로 viewer_id만으로 충분.
export async function listViewerReactions(_albumId: string, viewerId: string): Promise<Set<string>> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("reactions").select("photo_id").eq("viewer_id", viewerId);
  if (error) {
    throw new Error("반응을 불러오지 못했어요.");
  }
  return new Set((data ?? []).map((row) => row.photo_id));
}

// 하트 토글: 있으면 취소, 없으면 추가. 새 개수를 돌려준다.
export async function toggleReaction(albumId: string, photoId: string, viewerId: string): Promise<{ reacted: boolean; count: number }> {
  const supabase = createSupabaseServiceClient();

  const { data: photo } = await supabase.from("photos").select("id").eq("id", photoId).eq("album_id", albumId).maybeSingle();
  if (!photo) {
    throw new Error("사진을 찾지 못했어요.");
  }

  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("photo_id", photoId)
    .eq("viewer_id", viewerId)
    .maybeSingle();

  let reacted: boolean;
  if (existing) {
    await supabase.from("reactions").delete().eq("id", existing.id);
    reacted = false;
  } else {
    await supabase.from("reactions").insert({ photo_id: photoId, viewer_id: viewerId });
    reacted = true;
  }

  const { count } = await supabase.from("reactions").select("id", { count: "exact", head: true }).eq("photo_id", photoId);
  return { reacted, count: count ?? 0 };
}
