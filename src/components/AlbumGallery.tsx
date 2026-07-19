"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PhotoComment } from "@/lib/comments";
import { CalendarView } from "./CalendarView";

export type GalleryPhoto = {
  id: string;
  caption: string | null;
  dateLabel: string;
  thumbUrl: string;
  viewUrl: string;
  videoUrl: string | null;
  isVideo: boolean;
  downloadUrl: string;
  width: number;
  height: number;
  childIds: string[];
  childName: string | null;
  childAge: string | null;
  comments: PhotoComment[];
  reactionCount: number;
  iReacted: boolean;
  dateValue: string;
};

export type GalleryGroup = {
  label: string;
  photos: GalleryPhoto[];
};

export type GalleryKid = {
  id: string;
  name: string;
};

const SLIDESHOW_MS = 3500;

// 업로드 때 메모 앞에 붙는 감정 이모지들 (UploadForm과 같은 세트). 감정별 모아보기에 쓴다.
const EMOTIONS = ["😊", "🥰", "😄", "😌", "😢", "😴", "😮", "🤒"];

function Heart({ filled, className }: { filled: boolean; className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

// 하트를 켤 때 아이콘이 '통' 튀는 작은 팝. 움직임 최소화 설정이면 튀지 않는다.
function popHeart(svg: SVGElement | null) {
  if (!svg || typeof svg.animate !== "function") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  svg.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.4)" }, { transform: "scale(1)" }],
    { duration: 320, easing: "cubic-bezier(.5, 1.6, .5, 1)" },
  );
}

export function AlbumGallery({
  groups,
  kids,
  slug,
  canComment,
  downloadsEnabled,
}: {
  groups: GalleryGroup[];
  kids: GalleryKid[];
  slug: string;
  canComment: boolean;
  downloadsEnabled: boolean;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [added, setAdded] = useState<Record<string, PhotoComment[]>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [reactState, setReactState] = useState<Record<string, { count: number; mine: boolean }>>(() => {
    const map: Record<string, { count: number; mine: boolean }> = {};
    for (const group of groups) {
      for (const photo of group.photos) {
        map[photo.id] = { count: photo.reactionCount, mine: photo.iReacted };
      }
    }
    return map;
  });
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [emotionFilter, setEmotionFilter] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const showFilter = kids.length >= 2;

  // 폰 공유창(Web Share)이 파일 공유를 지원하는 기기에서만 공유 버튼을 띄운다.
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.canShare === "function" && typeof navigator.share === "function");
  }, []);

  // 스와이프 지원
  const touchStartX = useRef<number | null>(null);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const group of groups) {
      for (const photo of group.photos) {
        const value = new Date(photo.dateValue).getFullYear();
        if (!Number.isNaN(value)) {
          set.add(value);
        }
      }
    }
    return [...set].sort((a, b) => b - a);
  }, [groups]);

  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtering = Boolean(picked) || q.length > 0 || favoritesOnly || year !== null || month !== null || emotionFilter !== null;
    if (!filtering) {
      return groups;
    }
    return groups
      .map((group) => ({
        ...group,
        photos: group.photos.filter((photo) => {
          // "온 가족(안 고름)" 사진(childIds 비었음)은 어느 아이를 골라도 항상 보이게.
          if (picked && photo.childIds.length > 0 && !photo.childIds.includes(picked)) return false;
          if (q && !(photo.caption ?? "").toLowerCase().includes(q)) return false;
          if (favoritesOnly && !(reactState[photo.id]?.mine ?? photo.iReacted)) return false;
          // 감정별 모아보기 — 메모가 그 감정 이모지로 시작하는 사진만.
          if (emotionFilter && !(photo.caption ?? "").startsWith(emotionFilter)) return false;
          if (year !== null || month !== null) {
            const date = new Date(photo.dateValue);
            if (year !== null && date.getFullYear() !== year) return false;
            if (month !== null && date.getMonth() + 1 !== month) return false;
          }
          return true;
        }),
      }))
      .filter((group) => group.photos.length > 0);
  }, [groups, picked, query, favoritesOnly, year, month, emotionFilter, reactState]);

  const flat = useMemo(() => visibleGroups.flatMap((group) => group.photos), [visibleGroups]);
  const open = openIndex === null ? null : (flat[openIndex] ?? null);

  const hasActiveFilter =
    Boolean(picked) || favoritesOnly || year !== null || month !== null || emotionFilter !== null || query.trim().length > 0;

  function close() {
    setOpenIndex(null);
    setPlaying(false);
    setZoomed(false);
    setShareError(null);
  }
  function go(delta: number) {
    setZoomed(false);
    setShareError(null);
    setOpenIndex((current) => {
      if (current === null) {
        return current;
      }
      const next = current + delta;
      return next < 0 || next >= flat.length ? current : next;
    });
  }
  function clearAllFilters() {
    setPicked(null);
    setFavoritesOnly(false);
    setYear(null);
    setMonth(null);
    setEmotionFilter(null);
    setQuery("");
  }

  useEffect(() => {
    setOpenIndex(null);
    setPlaying(false);
  }, [picked]);

  useEffect(() => {
    if (open === null) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!playing || openIndex === null) {
      return;
    }
    // 영상은 시간으로 넘기지 않고, 영상이 끝날 때(onEnded) 다음으로 넘어간다.
    if (open?.isVideo) {
      return;
    }
    const timer = setInterval(() => {
      setOpenIndex((current) => {
        if (current === null || current + 1 >= flat.length) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, SLIDESHOW_MS);
    return () => clearInterval(timer);
  }, [playing, openIndex, flat.length, open?.isVideo]);

  async function submitComment() {
    if (!open || !text.trim() || sending) {
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/a/${slug}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: open.id, body: text.trim() }),
      });
      const data = (await res.json()) as { comment?: PhotoComment };
      if (res.ok && data.comment) {
        const comment = data.comment;
        setAdded((prev) => ({ ...prev, [comment.photoId]: [...(prev[comment.photoId] ?? []), comment] }));
        setText("");
      }
    } finally {
      setSending(false);
    }
  }

  async function toggleReact(photoId: string) {
    if (!canComment) {
      return;
    }
    setReactState((state) => {
      const current = state[photoId] ?? { count: 0, mine: false };
      return { ...state, [photoId]: { count: current.count + (current.mine ? -1 : 1), mine: !current.mine } };
    });
    try {
      const res = await fetch(`/a/${slug}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });
      const data = (await res.json()) as { reacted?: boolean; count?: number };
      if (res.ok && typeof data.count === "number") {
        setReactState((state) => ({ ...state, [photoId]: { count: data.count as number, mine: Boolean(data.reacted) } }));
      }
    } catch {
      // 실패하면 다음 새로고침에 서버 값으로 맞춰진다
    }
  }

  async function shareCurrent() {
    if (!open || sharing) {
      return;
    }
    setSharing(true);
    setShareError(null);
    try {
      // 저장소 직접 접근은 CORS로 막히므로, 우리 서버(same-origin)를 거쳐 파일을 받는다.
      // 비밀 링크는 싣지 않는다.
      const src = `/a/${slug}/media/${open.id}`;
      const res = await fetch(src);
      if (!res.ok) {
        throw new Error(`status ${res.status}`);
      }
      const blob = await res.blob();
      const isVideo = open.isVideo;
      const type = blob.type || (isVideo ? "video/mp4" : "image/webp");
      const ext = (type.split("/")[1]?.split(/[;+]/)[0]) || (isVideo ? "mp4" : "webp");
      const file = new File([blob], `까꿍.${ext}`, { type });
      if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] })) {
        setShareError("이 기기는 사진 공유를 지원하지 않아요. 사진을 저장한 뒤 직접 올려주세요.");
        return;
      }
      await navigator.share({ files: [file], title: "까꿍", text: open.caption ?? "우리 아기 사진 보세요 🐣" });
    } catch (err) {
      // 사용자가 공유창을 닫은 것(AbortError)은 정상 — 안내하지 않는다.
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setShareError("공유하지 못했어요. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setSharing(false);
    }
  }

  const openComments = open ? [...open.comments, ...(added[open.id] ?? [])] : [];
  const hasPrev = openIndex !== null && openIndex > 0;
  const hasNext = openIndex !== null && openIndex < flat.length - 1;
  const openReact = open ? (reactState[open.id] ?? { count: open.reactionCount, mine: open.iReacted }) : null;

  return (
    <>
      {/* ── 필터 바 ── */}
      <div className="sticky top-0 z-20 bg-paper/95 pb-2 pt-2 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-2">
          {showFilter ? (
            <div className="flex flex-1 flex-wrap gap-2 overflow-x-auto">
              <FilterPill label="전체" on={picked === null} onClick={() => setPicked(null)} />
              {kids.map((kid) => (
                <FilterPill key={kid.id} label={kid.name} on={picked === kid.id} onClick={() => setPicked(kid.id)} />
              ))}
            </div>
          ) : (
            <div className="flex-1" />
          )}
          {/* 목록 ↔ 달력 전환 */}
          <button
            type="button"
            onClick={() => setViewMode((mode) => (mode === "list" ? "calendar" : "list"))}
            aria-label={viewMode === "list" ? "달력으로 보기" : "목록으로 보기"}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-line bg-white px-4 py-1.5 text-[0.9375rem] font-semibold text-ink-soft"
          >
            {viewMode === "list" ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M3 9h18M8 2v4M16 2v4" />
                </svg>
                달력
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                목록
              </>
            )}
          </button>
          {/* 검색 토글 버튼 */}
          <button
            type="button"
            onClick={() => setShowSearch((value) => !value)}
            aria-label="검색 및 필터"
            aria-expanded={showSearch}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 px-4 py-1.5 text-[0.9375rem] font-semibold transition-colors ${
              showSearch || hasActiveFilter
                ? "border-apricot bg-apricot-soft text-apricot-deep"
                : "border-line bg-white text-ink-soft"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            {hasActiveFilter ? "필터 중" : "찾기"}
          </button>
        </div>

        {/* 검색 패널 — 펼쳐지는 영역 */}
        {showSearch ? (
          <div className="mt-2 space-y-2 rounded-2xl border border-line bg-white px-3 py-3 mx-2 shadow-soft">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="메모로 찾기 (예: 뒤집)"
              aria-label="메모로 찾기"
              className="min-h-11 w-full rounded-xl border-2 border-line px-4 text-base focus:border-apricot focus:outline-none"
            />
            {/* 감정별 모아보기 — 그날 기분으로 사진 찾기 */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-sm font-semibold text-ink-soft">기분</span>
              {EMOTIONS.map((em) => {
                const on = emotionFilter === em;
                return (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmotionFilter(on ? null : em)}
                    aria-label={`${em} 기분 사진만 보기`}
                    aria-pressed={on}
                    className={
                      on
                        ? "rounded-full border-2 border-apricot bg-apricot-soft px-2 py-0.5 text-lg"
                        : "rounded-full border-2 border-line bg-white px-2 py-0.5 text-lg"
                    }
                  >
                    {em}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canComment ? (
                <button
                  type="button"
                  onClick={() => setFavoritesOnly((value) => !value)}
                  aria-pressed={favoritesOnly}
                  className={
                    favoritesOnly
                      ? "flex items-center gap-1.5 rounded-full border-2 border-apricot bg-apricot-soft px-3 py-1 text-sm font-bold text-apricot-deep"
                      : "flex items-center gap-1.5 rounded-full border-2 border-line bg-white px-3 py-1 text-sm font-semibold text-ink-soft"
                  }
                >
                  <Heart filled={favoritesOnly} className="h-3.5 w-3.5" />
                  즐겨찾기만
                </button>
              ) : null}
              {years.length > 0 ? (
                <select
                  value={year ?? ""}
                  onChange={(event) => setYear(event.target.value ? Number(event.target.value) : null)}
                  aria-label="연도로 찾기"
                  className="min-h-9 rounded-xl border-2 border-line bg-white px-3 text-sm"
                >
                  <option value="">모든 해</option>
                  {years.map((value) => (
                    <option key={value} value={value}>
                      {value}년
                    </option>
                  ))}
                </select>
              ) : null}
              <select
                value={month ?? ""}
                onChange={(event) => setMonth(event.target.value ? Number(event.target.value) : null)}
                aria-label="달로 찾기"
                className="min-h-9 rounded-xl border-2 border-line bg-white px-3 text-sm"
              >
                <option value="">모든 달</option>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {value}월
                  </option>
                ))}
              </select>
              {hasActiveFilter ? (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="rounded-full px-3 py-1 text-sm font-semibold text-apricot-deep underline"
                >
                  모두 보기
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {viewMode === "calendar" ? (
        <CalendarView photos={flat} onOpen={(id) => setOpenIndex(flat.findIndex((item) => item.id === id))} />
      ) : (
      <>
      {/* ── 사진 없음 안내 ── */}
      {visibleGroups.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-3 px-4 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-12 w-12 text-line" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <p className="text-lg font-semibold text-ink-soft">찾는 사진이 없어요.</p>
          {hasActiveFilter ? (
            <button type="button" onClick={clearAllFilters} className="text-base font-bold text-apricot underline">
              필터 초기화
            </button>
          ) : null}
        </div>
      ) : null}

      {/* ── 날짜 그룹별 갤러리 ── */}
      <div className="mt-3 space-y-8">
        {visibleGroups.map((group) => (
          <section key={group.label}>
            {/* 날짜 헤더 */}
            <div className="flex items-center gap-3 px-2 pb-3">
              <span className="rounded-full bg-sage-soft px-3.5 py-1.5 text-sm font-bold text-sage-deep">{group.label}</span>
              <span className="h-px flex-1 bg-line" />
              <span className="text-xs font-semibold text-ink-soft">{group.photos.length}장</span>
            </div>
            {/* 2열 그리드 — 가로 사진은 full-width */}
            <div className="grid grid-cols-2 gap-2 px-1">
              {group.photos.map((photo) => {
                const react = reactState[photo.id] ?? { count: photo.reactionCount, mine: photo.iReacted };
                const commentCount = photo.comments.length + (added[photo.id]?.length ?? 0);
                const isWide = photo.width > 0 && photo.height > 0 && photo.width / photo.height > 1.4;
                return (
                  <div
                    key={photo.id}
                    className={`photo-card relative overflow-hidden rounded-2xl bg-white shadow-soft ${isWide ? "col-span-2" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIndex(flat.findIndex((item) => item.id === photo.id))}
                      aria-label={`${photo.caption ?? "사진"} 크게 보기`}
                      className="block w-full text-left"
                    >
                      {photo.childName ? (
                        <span className="absolute left-2 top-2 z-10 rounded-full bg-black/50 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
                          {photo.childName}
                        </span>
                      ) : null}
                      {photo.isVideo ? (
                        <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-7 w-7 text-white" aria-hidden>
                              <path d="M7 5l12 7-12 7z" />
                            </svg>
                          </span>
                        </span>
                      ) : null}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.thumbUrl}
                        alt={photo.caption ?? "가족 사진"}
                        width={photo.width}
                        height={photo.height}
                        loading="lazy"
                        decoding="async"
                        className={`photo-img w-full bg-paper-2 object-cover ${isWide ? "aspect-video" : "aspect-square"}`}
                      />
                      {photo.caption ? (
                        <p className="px-3 pt-2.5 pb-0.5 text-[0.875rem] font-medium leading-[1.45] text-ink">{photo.caption}</p>
                      ) : null}
                    </button>
                    {/* 반응 바 */}
                    <div className="flex items-center gap-3 px-3 pb-2 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          if (!react.mine) popHeart(e.currentTarget.querySelector("svg"));
                          toggleReact(photo.id);
                        }}
                        aria-label={react.mine ? "하트 취소" : "하트"}
                        aria-pressed={react.mine}
                        className={`flex items-center gap-1 text-sm font-bold transition-colors ${react.mine ? "text-apricot" : "text-ink-soft"}`}
                      >
                        <Heart filled={react.mine} className="h-5 w-5" />
                        {react.count > 0 ? react.count : ""}
                      </button>
                      {commentCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-ink-soft">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
                            <path d="M21 11.5a8 8 0 0 1-11.5 7.2L4 20l1.3-4.4A8 8 0 1 1 21 11.5z" />
                          </svg>
                          {commentCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      </>
      )}

      {/* ── 라이트박스 ── */}
      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black"
          role="dialog"
          aria-modal="true"
          aria-label="사진 크게 보기"
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const diff = touchStartX.current - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) go(diff > 0 ? 1 : -1);
            touchStartX.current = null;
          }}
        >
          {/* 상단 툴바 — 슬라이드쇼 중엔 숨겨 사진을 화면 가득 채운다 */}
          {!playing ? (
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3 bg-black/60 backdrop-blur-sm">
            {/* 진행 표시 */}
            <span className="text-sm font-semibold text-white/60">
              {openIndex !== null ? `${openIndex + 1} / ${flat.length}` : ""}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPlaying((value) => !value)}
                className="flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-bold text-white"
                aria-label={playing ? "슬라이드쇼 멈춤" : "슬라이드쇼 재생"}
              >
                {playing ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
                    <path d="M7 5l12 7-12 7z" />
                  </svg>
                )}
                {playing ? "멈춤" : "재생"}
              </button>
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          </div>
          ) : null}

          {/* 이미지 영역 — flex-1로 남은 공간 최대 활용 (재생 중 탭하면 멈춤) */}
          <div
            onClick={() => { if (playing) setPlaying(false); }}
            className={`relative flex min-h-0 flex-1 items-center justify-center bg-black ${zoomed ? "overflow-auto" : "overflow-hidden"}`}
          >
            {/* 이전 버튼 — 더 크고 뚜렷하게 */}
            {!playing && hasPrev ? (
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="이전 사진"
                className="absolute left-2 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm border border-white/20"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-7 w-7" aria-hidden>
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
            ) : null}
            {open.isVideo && open.videoUrl ? (
              <video
                key={open.id}
                src={open.videoUrl}
                controls
                autoPlay
                playsInline
                onEnded={() => {
                  // 슬라이드쇼 중이면 영상이 끝날 때 다음으로. 마지막이면 멈춘다.
                  if (!playing) return;
                  if (openIndex !== null && openIndex + 1 < flat.length) go(1);
                  else setPlaying(false);
                }}
                className="max-h-full max-w-full rounded-xl"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={open.viewUrl}
                alt={open.caption ?? "가족 사진"}
                decoding="async"
                onDoubleClick={() => setZoomed((value) => !value)}
                className={zoomed ? "w-[200%] max-w-none cursor-zoom-out rounded-xl" : "max-h-full max-w-full cursor-zoom-in rounded-xl object-contain"}
              />
            )}
            {/* 다음 버튼 */}
            {!playing && hasNext ? (
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="다음 사진"
                className="absolute right-2 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm border border-white/20"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-7 w-7" aria-hidden>
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            ) : null}
          </div>

          {/* 하단 정보 패널 — 슬라이드쇼 중엔 숨겨 사진을 화면 가득 채운다 */}
          {!playing ? (
          <div className="shrink-0 max-h-[38vh] overflow-y-auto bg-gradient-to-t from-black to-black/80 px-4 pb-safe-bottom pt-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/60">
                  {open.childName ? `${open.childName}${open.childAge ? ` · ${open.childAge}` : ""} · ` : ""}
                  {open.dateLabel}
                </p>
                {open.caption ? <p className="mt-1 text-base font-semibold text-white leading-6">{open.caption}</p> : null}
              </div>
              {openReact ? (
                <button
                  type="button"
                  onClick={(e) => {
                    if (!openReact.mine) popHeart(e.currentTarget.querySelector("svg"));
                    toggleReact(open.id);
                  }}
                  aria-label={openReact.mine ? "하트 취소" : "하트"}
                  aria-pressed={openReact.mine}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-base font-bold transition-colors ${openReact.mine ? "bg-apricot text-white" : "bg-white/15 text-white"}`}
                >
                  <Heart filled={openReact.mine} className="h-5 w-5" />
                  {openReact.count > 0 ? openReact.count : "하트"}
                </button>
              ) : null}
            </div>

            {/* 댓글 목록 */}
            {openComments.length > 0 ? (
              <ul className="mt-3 space-y-2 border-t border-white/10 pt-3">
                {openComments.map((comment) => (
                  <li key={comment.id} className="text-sm leading-6 text-white/90">
                    <span className="font-bold text-apricot">{comment.name}</span>{" "}
                    {comment.body}
                  </li>
                ))}
              </ul>
            ) : null}

            {/* 댓글 입력 */}
            {canComment ? (
              <div className="mt-3 flex gap-2">
                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      submitComment();
                    }
                  }}
                  maxLength={300}
                  placeholder="한마디 남기기…"
                  aria-label="한마디 남기기"
                  className="min-h-11 flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm text-white placeholder:text-white/40 focus:border-apricot focus:outline-none"
                />
                <button
                  type="button"
                  onClick={submitComment}
                  disabled={sending || !text.trim()}
                  className="min-h-11 rounded-2xl bg-apricot px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                  남기기
                </button>
              </div>
            ) : null}

            {/* 저장 버튼 — 자주 쓰는 액션이라 위·강조 */}
            {downloadsEnabled ? (
              <a
                href={open.downloadUrl}
                className="cta mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-apricot text-base font-bold text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
                  <path d="M4 17v3h16v-3" />
                </svg>
                {open.isVideo ? "영상 저장하기" : "사진 저장하기"}
              </a>
            ) : null}

            {/* 공유(자랑) 버튼 — 폰 공유창(문자·카톡·페북·인스타) */}
            {canShare && downloadsEnabled ? (
              <button
                type="button"
                onClick={shareCurrent}
                disabled={sharing}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 text-base font-bold text-white disabled:opacity-60"
              >
                {sharing ? (
                  "여는 중…"
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
                      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                      <path d="M16 6l-4-4-4 4" />
                      <path d="M12 2v13" />
                    </svg>
                    자랑하기 (문자·카톡·SNS)
                  </>
                )}
              </button>
            ) : null}
            {shareError ? (
              <p className="mt-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white/90">{shareError}</p>
            ) : null}
            <div className="h-4" />
          </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function FilterPill({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={
        on
          ? "rounded-full border-2 border-sage bg-sage-soft px-4 py-1.5 text-[0.9375rem] font-bold text-sage-deep"
          : "rounded-full border-2 border-line bg-white px-4 py-1.5 text-[0.9375rem] font-semibold text-ink-soft"
      }
    >
      {label}
    </button>
  );
}
