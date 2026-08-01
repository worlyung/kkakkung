"use client";

import { useState } from "react";

export type ReplyNotice = {
  photoId: string;
  name: string;
  body: string;
  repliedTo: string | null; // 답글이면 원 한마디 내용, 새 한마디면 null
  createdAt: string;
};

// 페이지 맨 위 "내 한마디에 새 답글" 알림. 확인했어요를 누르면 서버에 표시하고 사라진다.
export function ReplyNotices({ slug, notices }: { slug: string; notices: ReplyNotice[] }) {
  const [hidden, setHidden] = useState(false);

  if (hidden || notices.length === 0) {
    return null;
  }

  function dismiss() {
    setHidden(true);
    // 실패해도 다음 방문 때 다시 보일 뿐이라 조용히 넘어간다.
    fetch(`/a/${slug}/replies/seen`, { method: "POST" }).catch(() => {});
  }

  return (
    <div className="mx-1 mt-3 rounded-2xl bg-apricot-soft px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-apricot-deep">💬 새 한마디가 왔어요</p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-apricot-deep shadow-sm"
        >
          확인했어요
        </button>
      </div>
      <ul className="mt-2 space-y-1">
        {notices.slice(0, 3).map((notice, index) => (
          <li key={index}>
            {/* 누르면 갤러리가 그 사진을 크게 연다 (AlbumGallery가 이 신호를 듣는다) */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("kkakkung:open-photo", { detail: notice.photoId }))}
              className="block w-full truncate text-left text-sm leading-6 text-ink underline-offset-2 hover:underline"
            >
              <span className="font-bold">{notice.name}</span>
              {notice.repliedTo ? (
                <span className="text-ink-soft"> · &ldquo;{notice.repliedTo}&rdquo;에 답글: </span>
              ) : (
                <span className="text-ink-soft"> · 사진에 한마디: </span>
              )}
              {notice.body}
            </button>
          </li>
        ))}
        {notices.length > 3 ? <li className="text-xs text-ink-soft">외 {notices.length - 3}개</li> : null}
      </ul>
    </div>
  );
}
