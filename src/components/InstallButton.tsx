"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallButton() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // 이미 홈 화면 앱으로 열렸으면 버튼을 숨긴다.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // 이미 설치됐거나, 설치를 지원하지 않는 환경(deferred 없고 iOS도 아님)이면 아무것도 안 보인다.
  if (installed || (!deferred && !isIOS)) {
    return null;
  }

  async function onClick() {
    if (deferred) {
      await deferred.prompt();
      setDeferred(null);
    } else {
      setShowGuide(true);
    }
  }

  return (
    <div className="mx-1 mt-3">
      <button
        type="button"
        onClick={onClick}
        className="cta flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-apricot bg-apricot-soft text-base font-bold text-apricot-deep"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
          <rect x="5" y="2" width="14" height="20" rx="3" />
          <path d="M12 6v6m0 0 2.5-2.5M12 12 9.5 9.5" />
        </svg>
        홈 화면에 바로가기 추가
      </button>

      {showGuide ? (
        <div className="mt-2 rounded-2xl border border-line bg-white px-4 py-3 text-base leading-7 text-ink">
          <p className="font-bold text-apricot-deep">아이폰에서 추가하는 법</p>
          <p className="mt-1">
            아래 <b>공유 버튼</b>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mx-1 inline h-4 w-4 align-text-bottom" aria-hidden>
              <path d="M12 16V4m0 0 4 4m-4-4L8 8" />
              <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
            </svg>
            을 누르고 <b>홈 화면에 추가</b>를 선택하면 돼요.
          </p>
          <button type="button" onClick={() => setShowGuide(false)} className="mt-2 text-sm font-bold text-ink-soft underline">
            닫기
          </button>
        </div>
      ) : null}
    </div>
  );
}
