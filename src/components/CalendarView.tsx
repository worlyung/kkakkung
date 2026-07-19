"use client";

import { useMemo, useState } from "react";
import type { GalleryPhoto } from "./AlbumGallery";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function CalendarView({ photos, onOpen }: { photos: GalleryPhoto[]; onOpen: (photoId: string) => void }) {
  // 날짜별 사진 묶음
  const byDay = useMemo(() => {
    const map = new Map<string, GalleryPhoto[]>();
    for (const photo of photos) {
      const date = new Date(photo.dateValue);
      if (Number.isNaN(date.getTime())) {
        continue;
      }
      const key = dayKey(date);
      const arr = map.get(key);
      if (arr) {
        arr.push(photo);
      } else {
        map.set(key, [photo]);
      }
    }
    return map;
  }, [photos]);

  // 가장 최근 사진이 있는 달로 시작
  const [ym, setYm] = useState(() => {
    const base = photos.length > 0 ? new Date(photos[0].dateValue) : new Date(0);
    return { y: base.getFullYear(), m: base.getMonth() };
  });

  const cells = useMemo(() => {
    const firstDay = new Date(ym.y, ym.m, 1).getDay(); // 1일의 요일(0=일)
    const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
    const list: (number | null)[] = [];
    for (let i = 0; i < firstDay; i += 1) {
      list.push(null);
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      list.push(d);
    }
    return list;
  }, [ym]);

  // 지금 보는 달에 사진이 하나라도 있는지
  const monthHasPhotos = useMemo(
    () => cells.some((day) => day !== null && (byDay.get(dayKey(new Date(ym.y, ym.m, day)))?.length ?? 0) > 0),
    [cells, byDay, ym],
  );

  function shift(delta: number) {
    setYm((cur) => {
      const next = new Date(cur.y, cur.m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });
  }

  return (
    <div className="mt-3 px-1">
      {/* 월 이동 */}
      <div className="flex items-center justify-between px-1 pb-3">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="이전 달"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <span className="text-lg font-bold text-ink">
          {ym.y}년 {ym.m + 1}월
        </span>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="다음 달"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      {/* 요일 머리 */}
      <div className="grid grid-cols-7 gap-1 pb-1">
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={`text-center text-xs font-bold ${i === 0 ? "text-apricot-deep" : "text-ink-soft"}`}>
            {w}
          </span>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`e${index}`} className="aspect-square" />;
          }
          const key = dayKey(new Date(ym.y, ym.m, day));
          const dayPhotos = byDay.get(key) ?? [];
          if (dayPhotos.length === 0) {
            return (
              <div key={day} className="flex aspect-square items-center justify-center rounded-lg text-sm text-ink-soft/50">
                {day}
              </div>
            );
          }
          return (
            <button
              key={day}
              type="button"
              onClick={() => onOpen(dayPhotos[0].id)}
              aria-label={`${ym.m + 1}월 ${day}일 사진 ${dayPhotos.length}장`}
              className="relative aspect-square overflow-hidden rounded-lg bg-paper-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dayPhotos[0].thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute left-1 top-1 rounded bg-black/45 px-1 text-[0.625rem] font-bold text-white">{day}</span>
              {dayPhotos.length > 1 ? (
                <span className="absolute bottom-1 right-1 rounded-full bg-black/55 px-1.5 text-[0.625rem] font-bold text-white">
                  {dayPhotos.length}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {!monthHasPhotos ? (
        <p className="mt-5 text-center text-base text-ink-soft">이 달에는 사진이 없어요</p>
      ) : null}
    </div>
  );
}
