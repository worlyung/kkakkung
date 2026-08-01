-- 한마디에 답글(대댓글) 달기.
-- parent_id가 있으면 그 한마디에 달린 답글이다. 원 한마디가 지워지면 답글도 같이 지워진다.
alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade;

-- 내 한마디에 달린 새 답글 알림 — "여기까지 확인했어요" 시각.
alter table public.viewers
  add column if not exists replies_checked_at timestamptz;
