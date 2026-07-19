"use client";

import { useEffect } from "react";

// 폼 저장·삭제 후 새로고침돼도 보던 위치에 그대로 있게 스크롤을 기억한다.
export function ScrollRestore() {
  useEffect(() => {
    const key = `ph_scroll_${window.location.pathname}`;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      window.scrollTo(0, Number(saved) || 0);
    }
    const save = () => sessionStorage.setItem(key, String(window.scrollY));
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, []);

  return null;
}
