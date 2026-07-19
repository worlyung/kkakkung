-- 005_album_cover.sql
-- 앨범 표지(커버)로 쓸 사진을 지정할 수 있게 한다. 비어 있으면 가장 최근 사진이 자동 표지.
-- 이미 쓰던 데이터베이스에서 한 번 실행. 여러 번 실행해도 안전.
-- (photos<->albums 순환 참조를 피하려 FK 없이 uuid만. 유효성은 앱에서 확인.)

alter table public.albums add column if not exists cover_photo_id uuid;
