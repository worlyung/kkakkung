import type { Child } from "@/types/database";
import { createSupabaseServiceClient } from "./supabase";

export async function listAlbumChildren(albumId: string): Promise<Child[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("children")
    .select("*")
    .eq("album_id", albumId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("아이 정보를 불러오지 못했어요.");
  }

  return data ?? [];
}

export async function addChild(albumId: string, name: string, birthdate: string | null): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("children").insert({ album_id: albumId, name, birthdate });
  if (error) {
    throw new Error("아이를 추가하지 못했어요.");
  }
}

export async function updateChild(albumId: string, childId: string, name: string, birthdate: string | null): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("children").update({ name, birthdate }).eq("id", childId).eq("album_id", albumId);
  if (error) {
    throw new Error("아이 정보를 고치지 못했어요.");
  }
}

export async function deleteChild(albumId: string, childId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  // album_id로 범위를 좁혀 남의 앨범 아이를 못 지우게 한다. 사진의 child_id는 자동으로 비워진다(미지정).
  const { error } = await supabase.from("children").delete().eq("id", childId).eq("album_id", albumId);
  if (error) {
    throw new Error("아이를 지우지 못했어요.");
  }
}
