"use client";

import { useEffect, useState } from "react";

export function ShareLinkActions({ shareUrl }: { shareUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // 구형/비보안 환경 대비 폴백
      const area = document.createElement("textarea");
      area.value = shareUrl;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
      } catch {
        // 그래도 안 되면 사용자가 직접 복사
      }
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    try {
      await navigator.share({ url: shareUrl, title: "까꿍 사진첩", text: "우리 아기 사진첩이에요" });
    } catch {
      // 사용자가 공유창을 닫은 경우 등 — 무시
    }
  }

  return (
    <div className="mt-4 space-y-2">
      {canShare ? (
        <button
          type="button"
          onClick={share}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-apricot px-6 text-xl font-bold text-white shadow-soft"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden>
            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
            <path d="M16 6l-4-4-4 4" />
            <path d="M12 2v13" />
          </svg>
          링크 공유하기 (문자·카톡)
        </button>
      ) : null}
      <button
        type="button"
        onClick={copy}
        className={
          canShare
            ? "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-line bg-white px-6 text-base font-bold text-ink-soft"
            : "flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-apricot px-6 text-xl font-bold text-white shadow-soft"
        }
      >
        {copied ? (
          "복사됐어요!"
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden>
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
            링크 복사하기
          </>
        )}
      </button>
    </div>
  );
}
