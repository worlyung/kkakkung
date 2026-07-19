-- 002_children_social.sql
-- 기존 앨범/사진은 그대로 두고, 아이·보는사람·한마디만 추가한다.
-- 이미 만들어진 데이터베이스에서 한 번 실행. 여러 번 실행해도 안전(IF NOT EXISTS).

create extension if not exists pgcrypto;

-- 아이 (children) : 한 앨범에 준영·서아를 이름으로 구분, 나이 라벨 계산용
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  birthdate date,
  created_at timestamptz not null default now()
);

-- 사진에 "누구 사진" 연결 (비어 있으면 온 가족/미지정)
alter table public.photos add column if not exists child_id uuid references public.children(id) on delete set null;

-- 보는사람 (viewers) : "누구세요?" 이름 톡 목록 + 누가 언제 봤나
create table if not exists public.viewers (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

-- 한마디 (comments)
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  viewer_id uuid not null references public.viewers(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 300),
  created_at timestamptz not null default now()
);

-- 조회 빠르게
create index if not exists children_album_idx on public.children(album_id);
create index if not exists photos_child_idx on public.photos(child_id);
create index if not exists viewers_album_idx on public.viewers(album_id);
create index if not exists comments_photo_idx on public.comments(photo_id, created_at desc);

-- 새 표도 기존과 똑같이 잠근다: public 정책 없음 → 오직 서버의 service_role 키로만 접근.
alter table public.children enable row level security;
alter table public.viewers enable row level security;
alter table public.comments enable row level security;
