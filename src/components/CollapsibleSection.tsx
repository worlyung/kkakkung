"use client";

import { useEffect, useState, type ReactNode } from "react";

// 접이식 섹션. 평소엔 접혀 있고 제목을 누르면 열린다. 열림 상태는 기억한다.
export function CollapsibleSection({
  title,
  storageKey,
  defaultOpen = false,
  dashed = false,
  children,
}: {
  title: string;
  storageKey: string;
  defaultOpen?: boolean;
  dashed?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const saved = localStorage.getItem(`ph_sec_${storageKey}`);
    if (saved !== null) {
      setOpen(saved === "1");
    }
  }, [storageKey]);

  function toggle() {
    setOpen((current) => {
      const next = !current;
      localStorage.setItem(`ph_sec_${storageKey}`, next ? "1" : "0");
      return next;
    });
  }

  return (
    <section
      className={
        dashed
          ? "mt-6 rounded-[28px] border-2 border-dashed border-line bg-white p-5"
          : "mt-6 rounded-[28px] bg-white p-5 shadow-soft"
      }
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <h2 className="text-2xl font-bold">{title}</h2>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`h-6 w-6 shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
