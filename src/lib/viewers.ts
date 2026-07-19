import type { Viewer } from "@/types/database";
import { createSupabaseServiceClient } from "./supabase";

export async function listAlbumViewers(albumId: string): Promise<Viewer[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("viewers")
    .select("*")
    .eq("album_id", albumId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("가족 목록을 불러오지 못했어요.");
  }

  return data ?? [];
}

export async function getAlbumViewer(albumId: string, viewerId: string): Promise<Viewer | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("viewers")
    .select("*")
    .eq("album_id", albumId)
    .eq("id", viewerId)
    .maybeSingle();

  if (error) {
    throw new Error("가족 정보를 불러오지 못했어요.");
  }

  return data;
}

export async function touchViewer(viewerId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase.from("viewers").update({ last_seen_at: new Date().toISOString() }).eq("id", viewerId);
}

export async function addViewer(albumId: string, name: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("viewers").insert({ album_id: albumId, name });
  if (error) {
    throw new Error("가족을 추가하지 못했어요.");
  }
}

export async function updateViewer(albumId: string, viewerId: string, name: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("viewers").update({ name }).eq("id", viewerId).eq("album_id", albumId);
  if (error) {
    throw new Error("가족 이름을 고치지 못했어요.");
  }
}

export async function deleteViewer(albumId: string, viewerId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  // album_id로 범위를 좁힌다. 그 사람이 남긴 한마디도 함께 지워진다(cascade).
  const { error } = await supabase.from("viewers").delete().eq("id", viewerId).eq("album_id", albumId);
  if (error) {
    throw new Error("가족을 지우지 못했어요.");
  }
}
