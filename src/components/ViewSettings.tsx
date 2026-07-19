"use client";

import { useEffect, useState } from "react";

const SIZES = ["100%", "118%", "138%"];

export function ViewSettings() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(0);
  const [contrast, setContrast] = useState(false);

  // 저장된 설정 불러오기
  useEffect(() => {
    const savedSize = Number(localStorage.getItem("ph_size") ?? "0");
    const savedContrast = localStorage.getItem("ph_contrast") === "1";
    setSize(Number.isFinite(savedSize) ? Math.min(2, Math.max(0, savedSize)) : 0);
    setContrast(savedContrast);
  }, []);

  // 설정 적용 + 저장
  useEffect(() => {
    document.documentElement.style.fontSize = SIZES[size] ?? "100%";
    localStorage.setItem("ph_size", String(size));
  }, [size]);

  useEffect(() => {
    document.documentElement.classList.toggle("hi-contrast", contrast);
    localStorage.setItem("ph_contrast", contrast ? "1" : "0");
  }, [contrast]);

  return (
    <div className="fixed bottom-4 left-4 z-40">
      {open ? (
        <div className="mb-2 w-56 rounded-3xl border border-line bg-white p-4 shadow-soft">
          <p className="text-base font-bold">글자 크기</p>
          <div className="mt-2 flex gap-2">
            {["보통", "크게", "아주 크게"].map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setSize(index)}
                aria-pressed={size === index}
                className={
                  size === index
                    ? "flex-1 rounded-2xl border-2 border-apricot bg-apricot-soft py-2 text-sm font-bold text-apricot-deep"
                    : "flex-1 rounded-2xl border-2 border-line py-2 text-sm font-semibold text-ink-soft"
                }
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setContrast((value) => !value)}
            aria-pressed={contrast}
            className={
              contrast
                ? "mt-3 w-full rounded-2xl border-2 border-sage bg-sage-soft py-2.5 text-base font-bold text-sage-deep"
                : "mt-3 w-full rounded-2xl border-2 border-line py-2.5 text-base font-semibold text-ink-soft"
            }
          >
            고대비 {contrast ? "켜짐" : "꺼짐"}
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="글자 크기와 화면 설정"
        aria-expanded={open}
        className="flex h-9 items-center gap-1 rounded-full border border-line bg-white px-3 text-xs font-bold text-ink-soft shadow-soft"
      >
        <span aria-hidden className="text-sm">
          가
        </span>
        보기 설정
      </button>
    </div>
  );
}
