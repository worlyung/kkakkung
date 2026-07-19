-- 003_photo_trash.sql
-- 사진 휴지통: 바로 지우지 않고 "지운 시각"만 표시해 되살릴 수 있게 한다.
-- 이미 쓰던 데이터베이스에서 한 번 실행. 여러 번 실행해도 안전.

alter table public.photos add column if not exists deleted_at timestamptz;

-- 살아있는 사진(안 지운 것)만 빠르게 뽑기
create index if not exists photos_active_idx on public.photos(album_id) where deleted_at is null;
