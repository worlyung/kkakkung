-- 전체 스키마 (새로 설치할 때 한 번 실행). 여러 번 실행해도 안전(IF NOT EXISTS).
-- 이미 쓰던 데이터베이스에 아이·보는사람·한마디를 나중에 추가하려면 002_children_social.sql 을 쓴다.

create extension if not exists pgcrypto;

-- 앨범 : 한 가족의 사진 공간. 링크·암호가 붙는다.
create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  baby_name text not null check (char_length(trim(baby_name)) between 1 and 80),
  share_slug text not null unique check (char_length(share_slug) >= 10),
  viewer_passcode_hash text not null,
  admin_passcode_hash text not null,
  share_expires_at timestamptz,
  downloads_enabled boolean not null default true,
  cover_photo_id uuid,
  created_at timestamptz not null default now()
);

-- 아이 : 한 앨범에 준영·서아를 이름으로 구분, 나이 라벨 계산용
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  birthdate date,
  created_at timestamptz not null default now()
);

-- 사진 : child_id 가 비어 있으면 온 가족/미지정
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  storage_key text not null,
  thumb_key text not null,
  caption text,
  taken_at timestamptz,
  uploaded_at timestamptz not null default now(),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  original_width integer not null check (original_width > 0),
  original_height integer not null check (original_height > 0),
  mime_type text not null,
  file_size_bytes integer not null check (file_size_bytes > 0),
  deleted_at timestamptz
);

-- 보는사람 : "누구세요?" 이름 톡 목록 + 누가 언제 봤나
create table if not exists public.viewers (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

-- 한마디
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  viewer_id uuid not null references public.viewers(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 300),
  created_at timestamptz not null default now()
);

-- 하트 반응 (한 사람이 한 사진에 한 번)
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  viewer_id uuid not null references public.viewers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (photo_id, viewer_id)
);

create index if not exists albums_share_slug_idx on public.albums(share_slug);
create index if not exists photos_album_sort_idx on public.photos(album_id, coalesce(taken_at, uploaded_at) desc, uploaded_at desc);
create index if not exists photos_active_idx on public.photos(album_id) where deleted_at is null;
create index if not exists children_album_idx on public.children(album_id);
create index if not exists photos_child_idx on public.photos(child_id);
create index if not exists viewers_album_idx on public.viewers(album_id);
create index if not exists comments_photo_idx on public.comments(photo_id, created_at desc);
create index if not exists reactions_photo_idx on public.reactions(photo_id);

alter table public.albums enable row level security;
alter table public.children enable row level security;
alter table public.photos enable row level security;
alter table public.viewers enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;

-- public 정책은 일부러 만들지 않는다. 앱은 서버에서 SUPABASE_SERVICE_ROLE_KEY 로만 접근한다.
