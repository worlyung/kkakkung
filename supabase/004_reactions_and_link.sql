-- 004_reactions_and_link.sql
-- 하트 반응 + 링크 만료 + 다운로드 허용 여부.
-- 이미 쓰던 데이터베이스에서 한 번 실행. 여러 번 실행해도 안전.

create extension if not exists pgcrypto;

-- 하트 반응 (한 사람이 한 사진에 한 번, 다시 누르면 취소)
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  viewer_id uuid not null references public.viewers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (photo_id, viewer_id)
);
create index if not exists reactions_photo_idx on public.reactions(photo_id);
alter table public.reactions enable row level security;

-- 링크 만료(비어 있으면 만료 없음) + 다운로드 버튼 노출 여부
alter table public.albums add column if not exists share_expires_at timestamptz;
alter table public.albums add column if not exists downloads_enabled boolean not null default true;
