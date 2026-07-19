-- 한 사진에 여러 아이를 태그할 수 있게 child_ids(배열)를 추가한다.
-- 기존 단일 child_id는 하위호환·롤백 대비로 남겨둔다.

alter table public.photos
  add column if not exists child_ids uuid[] not null default '{}';

-- 이미 올라간 사진들: 단일 child_id를 배열로 옮긴다. (빈 배열인 것만)
update public.photos
  set child_ids = array[child_id]
  where child_id is not null
    and child_ids = '{}';

-- 아이별 필터를 빠르게 하기 위한 배열 인덱스.
create index if not exists photos_child_ids_idx on public.photos using gin (child_ids);
