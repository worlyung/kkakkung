"use client";

import { useEffect, useState } from "react";
import { downloadZip } from "client-zip";

export type BackupItem = {
  id: string;
  year: number;
  childIds: string[];
  ext: string;
  taken: string; // YYYYMMDD
};

export function BackupSection({
  slug,
  items,
  kids,
}: {
  slug: string;
  items: BackupItem[];
  kids: { id: string; name: string }[];
}) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 백업은 컴퓨터(넓은 화면 + 마우스)에서만.
  useEffect(() => {
    setIsDesktop(window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches);
  }, []);

  const years = [...new Set(items.map((item) => item.year))].sort((a, b) => b - a);

  async function download(label: string, subset: BackupItem[]) {
    if (busy || subset.length === 0) {
      return;
    }
    setBusy(label);
    setProgress(0);
    setError(null);
    try {
      let done = 0;
      // 파일을 하나씩 순차로 받아 ZIP에 흘려보낸다 (메모리 절약).
      async function* files() {
        for (const item of subset) {
          const res = await fetch(`/a/${slug}/media/${item.id}?full=1`);
          if (!res.ok) {
            throw new Error(`status ${res.status}`);
          }
          done += 1;
          setProgress(Math.round((done / subset.length) * 100));
          yield { name: `${item.taken}_${item.id}.${item.ext}`, input: res };
        }
      }
      const blob = await downloadZip(files()).blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `까꿍_${label}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("백업을 만들지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(null);
    }
  }

  if (!isDesktop) {
    return (
      <p className="rounded-2xl bg-paper-2 px-4 py-3 text-base leading-7 text-ink-soft">
        백업(전체 다운로드)은 <b className="text-ink">컴퓨터</b>에서 열어주세요. 사진·영상이 많아 컴퓨터에서 받는 게 안전해요.
      </p>
    );
  }

  const btn =
    "rounded-2xl border-2 border-line bg-white px-4 py-2.5 text-base font-bold text-ink disabled:opacity-50";

  return (
    <div className="space-y-4">
      <p className="text-base leading-7 text-ink-soft">
        올린 사진·영상을 원본 그대로 ZIP 파일로 내려받아요. 사진이 많으면 아래 <b className="text-ink">연도별</b>로 나눠 받는 게 안정적이에요.
      </p>

      <div>
        <button type="button" disabled={!!busy} onClick={() => download("전체", items)} className={`${btn} bg-apricot text-white`}>
          전체 받기 ({items.length}개)
        </button>
      </div>

      {years.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-bold text-ink-soft">연도별</p>
          <div className="flex flex-wrap gap-2">
            {years.map((year) => {
              const subset = items.filter((item) => item.year === year);
              return (
                <button key={year} type="button" disabled={!!busy} onClick={() => download(`${year}년`, subset)} className={btn}>
                  {year}년 ({subset.length})
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {kids.length >= 2 ? (
        <div>
          <p className="mb-2 text-sm font-bold text-ink-soft">아이별</p>
          <div className="flex flex-wrap gap-2">
            {kids.map((kid) => {
              const subset = items.filter((item) => item.childIds.includes(kid.id));
              return (
                <button
                  key={kid.id}
                  type="button"
                  disabled={!!busy || subset.length === 0}
                  onClick={() => download(kid.name, subset)}
                  className={btn}
                >
                  {kid.name} ({subset.length})
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {busy ? (
        <p className="rounded-2xl bg-apricot-soft px-4 py-3 text-base font-bold text-apricot-deep">
          {busy} 백업 준비 중… {progress}% (다 되면 자동으로 저장돼요)
        </p>
      ) : null}
      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-base font-bold text-red-700">{error}</p> : null}
    </div>
  );
}
