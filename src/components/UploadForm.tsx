"use client";

import { type FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type SelectedPhoto = {
  id: string;
  file: File;
  caption: string;
  emotion: string;
  childIds: string[];
  dateOverride: string;
  previewUrl: string;
  status: string;
};

// 오늘 기분 — 메모 앞에 붙여 일기처럼 남긴다.
const EMOTIONS: { emoji: string; label: string }[] = [
  { emoji: "😊", label: "행복" },
  { emoji: "🥰", label: "사랑" },
  { emoji: "😄", label: "신남" },
  { emoji: "😌", label: "편안" },
  { emoji: "😢", label: "속상" },
  { emoji: "😴", label: "졸림" },
  { emoji: "😮", label: "놀람" },
  { emoji: "🤒", label: "아픔" },
];

type Thumbnail = {
  blob: Blob;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
};

type UploadTicket = {
  originalUploadUrl: string;
  thumbUploadUrl: string;
  uploadToken: string;
  error?: string;
};

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

// 서버 lib(photos.ts)은 supabase 서버 코드를 물고 있어 클라이언트에서 import하지 않는다. 여기선 로컬 판별.
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
function isVideoFile(mimeType: string): boolean {
  return VIDEO_TYPES.has(mimeType);
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function inferMimeType(file: File): string {
  if (file.type) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension ? MIME_BY_EXTENSION[extension] ?? "" : "";
}

async function readTakenAt(file: File): Promise<string | null> {
  try {
    const exifr = await import("exifr");
    const fields = (await exifr.parse(file, {
      pick: ["DateTimeOriginal", "CreateDate", "ModifyDate"],
    })) as { DateTimeOriginal?: Date | string; CreateDate?: Date | string; ModifyDate?: Date | string } | undefined;
    const value = fields?.DateTimeOriginal ?? fields?.CreateDate ?? fields?.ModifyDate;

    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  } catch {
    return null;
  }
}

async function loadImageForCanvas(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fall back to an HTMLImageElement below.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = objectUrl;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("사진을 읽지 못했어요."));
  });

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    cleanup: () => URL.revokeObjectURL(objectUrl),
  };
}

async function createThumbnail(file: File): Promise<Thumbnail> {
  const image = await loadImageForCanvas(file);
  const maxSide = 800;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    image.cleanup();
    throw new Error("사진을 줄이지 못했어요.");
  }

  context.drawImage(image.source, 0, 0, width, height);
  image.cleanup();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error("보기용 사진을 만들지 못했어요."));
        }
      },
      "image/webp",
      0.82,
    );
  });

  return {
    blob,
    width,
    height,
    originalWidth: image.width,
    originalHeight: image.height,
  };
}

// 영상 첫 장면을 잡아 사진 썸네일과 같은 형식(webp)으로 만든다.
async function createVideoThumbnail(file: File): Promise<Thumbnail> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("영상을 읽지 못했어요."));
    });

    // 0초는 검은 프레임일 수 있어 살짝 뒤 장면을 잡는다.
    const target = Math.min(0.5, (Number.isFinite(video.duration) ? video.duration : 1) / 2);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = target;
    });

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) {
      throw new Error("영상 크기를 읽지 못했어요.");
    }
    const maxSide = 800;
    const scale = Math.min(1, maxSide / Math.max(vw, vh));
    const width = Math.max(1, Math.round(vw * scale));
    const height = Math.max(1, Math.round(vh * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("영상 미리보기를 만들지 못했어요.");
    }
    context.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("미리보기를 만들지 못했어요."))),
        "image/webp",
        0.82,
      );
    });

    return { blob, width, height, originalWidth: vw, originalHeight: vh };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function putObject(url: string, body: Blob, contentType: string): Promise<void> {
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body,
  });

  if (!response.ok) {
    throw new Error("사진 저장소에 올리지 못했어요.");
  }
}

async function uploadOne(photo: SelectedPhoto): Promise<void> {
  const mimeType = inferMimeType(photo.file);
  const video = isVideoFile(mimeType);
  const [thumbnail, exifTakenAt] = await Promise.all([
    video ? createVideoThumbnail(photo.file) : createThumbnail(photo.file),
    // 영상엔 EXIF 촬영일이 없으니 손으로 넣은 날짜만 쓴다.
    video ? Promise.resolve(null) : readTakenAt(photo.file),
  ]);
  // 손으로 날짜를 넣었으면 그걸 우선 (옛날 스캔 사진 등 EXIF 없거나 틀린 경우)
  const takenAt = photo.dateOverride ? new Date(photo.dateOverride).toISOString() : exifTakenAt;

  const signResponse = await fetch("/admin/uploads/sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mimeType,
      fileSizeBytes: photo.file.size,
      thumbSizeBytes: thumbnail.blob.size,
    }),
  });

  const ticket = (await signResponse.json()) as UploadTicket;
  if (!signResponse.ok) {
    throw new Error(ticket.error ?? "업로드 준비를 하지 못했어요.");
  }

  await Promise.all([
    putObject(ticket.originalUploadUrl, photo.file, mimeType),
    putObject(ticket.thumbUploadUrl, thumbnail.blob, "image/webp"),
  ]);

  const completeResponse = await fetch("/admin/uploads/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uploadToken: ticket.uploadToken,
      // 감정을 메모 앞에 붙여 일기처럼 저장한다.
      caption: [photo.emotion, photo.caption].filter(Boolean).join(" ").trim(),
      takenAt,
      childIds: photo.childIds,
      width: thumbnail.width,
      height: thumbnail.height,
      originalWidth: thumbnail.originalWidth,
      originalHeight: thumbnail.originalHeight,
    }),
  });

  const completeBody = (await completeResponse.json()) as { error?: string };
  if (!completeResponse.ok) {
    throw new Error(completeBody.error ?? "사진 정보를 저장하지 못했어요.");
  }
}

const ACCEPTED_TYPES = new Set(Object.values(MIME_BY_EXTENSION));

export function UploadForm({ kids }: { kids: { id: string; name: string }[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // 파일 선택·드롭 공통 처리. 사진·영상이 아닌 파일은 걸러낸다.
  function pickFiles(files: File[]) {
    const accepted = files.filter((file) => ACCEPTED_TYPES.has(inferMimeType(file)));
    if (accepted.length === 0) {
      setMessage("사진·영상 파일만 올릴 수 있어요.");
      return;
    }
    const selected = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      caption: "",
      emotion: "",
      childIds: [],
      dateOverride: "",
      previewUrl: URL.createObjectURL(file),
      status: "대기",
    }));
    setPhotos((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return selected;
    });
    setMessage(null);
  }

  // 잘못 고른 파일을 목록에서 한 장만 뺀다.
  function removePhoto(id: string) {
    setPhotos((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((item) => item.id !== id);
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (photos.length === 0 || isUploading) {
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      for (const photo of photos) {
        setPhotos((current) => current.map((item) => (item.id === photo.id ? { ...item, status: "올리는 중" } : item)));
        await uploadOne(photo);
        setPhotos((current) => current.map((item) => (item.id === photo.id ? { ...item, status: "완료" } : item)));
      }

      window.location.href = `/admin?uploaded=${photos.length}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "사진을 올리지 못했어요. 다시 시도해주세요.";
      setMessage(message);
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl bg-white p-5 shadow-soft">
      <h2 className="text-2xl font-bold">사진·영상 올리기</h2>
      <p className="mt-2 text-lg leading-7 text-slate-700">사진과 영상을 원본 그대로 저장하고, 보기용 미리보기를 자동으로 만들어요.</p>

      <label className="mt-6 block text-lg font-bold" htmlFor="photos">
        사진·영상 선택
      </label>
      {/* 드롭 존 — 컴퓨터에선 파일을 끌어다 놓아도 된다 */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!isUploading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (isUploading) return;
          pickFiles(Array.from(event.dataTransfer.files));
        }}
        className={`mt-3 rounded-2xl border-2 border-dashed p-4 transition-colors ${
          isDragging ? "border-apricot bg-apricot-soft" : "border-slate-300 bg-white"
        }`}
      >
        <input
          ref={inputRef}
          id="photos"
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
          multiple
          className="block w-full text-lg"
          onChange={(event) => pickFiles(Array.from(event.target.files ?? []))}
          disabled={isUploading}
        />
        <p className="mt-2 hidden text-sm text-ink-soft sm:block">
          컴퓨터에서는 사진·영상을 여기로 끌어다 놓아도 돼요.
        </p>
      </div>

      {message ? <p className="mt-5 rounded-2xl bg-red-50 p-4 text-lg font-bold text-red-700">{message}</p> : null}

      {photos.length > 0 ? (
        <div className="mt-5 space-y-4">
          {photos.map((photo, index) => (
            <div key={photo.id} className="rounded-2xl border border-line bg-paper-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {isVideoFile(inferMimeType(photo.file)) ? (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-line bg-paper-2 text-ink-soft">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-7 w-7" aria-hidden>
                        <path d="M7 5l12 7-12 7z" />
                      </svg>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={photo.previewUrl}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                      className="h-16 w-16 shrink-0 rounded-xl border border-line bg-white object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="break-all text-lg font-bold">{photo.file.name}</p>
                    <p className="text-base text-ink-soft">{formatSize(photo.file.size)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-base font-bold text-apricot-deep">{photo.status}</span>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => removePhoto(photo.id)}
                    aria-label={`${photo.file.name} 목록에서 빼기`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-line bg-white text-ink-soft"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4" aria-hidden>
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
              </div>
              <span className="mt-3 block text-base font-bold">오늘 기분</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {EMOTIONS.map((em) => {
                  const on = photo.emotion === em.emoji;
                  return (
                    <button
                      key={em.emoji}
                      type="button"
                      disabled={isUploading}
                      aria-label={em.label}
                      aria-pressed={on}
                      onClick={() =>
                        setPhotos((current) =>
                          current.map((item) =>
                            item.id === photo.id ? { ...item, emotion: on ? "" : em.emoji } : item,
                          ),
                        )
                      }
                      className={
                        on
                          ? "flex h-12 w-12 items-center justify-center rounded-xl border-2 border-apricot bg-apricot-soft text-2xl"
                          : "flex h-12 w-12 items-center justify-center rounded-xl border-2 border-line bg-white text-2xl"
                      }
                    >
                      {em.emoji}
                    </button>
                  );
                })}
              </div>
              <label className="mt-3 block text-base font-bold" htmlFor={`caption-${index}`}>
                한 줄 메모
              </label>
              <Input
                id={`caption-${index}`}
                type="text"
                maxLength={120}
                placeholder="예: 오늘 처음 뒤집었어요"
                value={photo.caption}
                disabled={isUploading}
                onChange={(event) => {
                  const caption = event.target.value;
                  setPhotos((current) => current.map((item) => (item.id === photo.id ? { ...item, caption } : item)));
                }}
                className="mt-2"
              />
              {kids.length > 0 ? (
                <>
                  <span className="mt-3 block text-base font-bold">
                    누구 사진? <span className="text-sm font-semibold text-ink-soft">(여러 명 고를 수 있어요)</span>
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {/* 온 가족 = 아무도 안 고른 상태 */}
                    <button
                      key="all"
                      type="button"
                      disabled={isUploading}
                      aria-pressed={photo.childIds.length === 0}
                      onClick={() =>
                        setPhotos((current) =>
                          current.map((item) => (item.id === photo.id ? { ...item, childIds: [] } : item)),
                        )
                      }
                      className={
                        photo.childIds.length === 0
                          ? "min-h-11 rounded-xl border-2 border-sage bg-sage-soft px-4 text-lg font-bold text-sage-deep"
                          : "min-h-11 rounded-xl border-2 border-line bg-white px-4 text-lg font-semibold text-ink-soft"
                      }
                    >
                      온 가족
                    </button>
                    {kids.map((kid) => {
                      const on = photo.childIds.includes(kid.id);
                      return (
                        <button
                          key={kid.id}
                          type="button"
                          disabled={isUploading}
                          aria-pressed={on}
                          onClick={() =>
                            setPhotos((current) =>
                              current.map((item) => {
                                if (item.id !== photo.id) return item;
                                const has = item.childIds.includes(kid.id);
                                return {
                                  ...item,
                                  childIds: has
                                    ? item.childIds.filter((id) => id !== kid.id)
                                    : [...item.childIds, kid.id],
                                };
                              }),
                            )
                          }
                          className={
                            on
                              ? "min-h-11 rounded-xl border-2 border-sage bg-sage-soft px-4 text-lg font-bold text-sage-deep"
                              : "min-h-11 rounded-xl border-2 border-line bg-white px-4 text-lg font-semibold text-ink-soft"
                          }
                        >
                          {kid.name}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
              <label className="mt-3 block text-base font-bold" htmlFor={`date-${index}`}>
                찍은 날짜 (선택 — 안 넣으면 사진에서 자동)
              </label>
              <Input
                id={`date-${index}`}
                type="date"
                value={photo.dateOverride}
                disabled={isUploading}
                onChange={(event) => {
                  const dateOverride = event.target.value;
                  setPhotos((current) => current.map((item) => (item.id === photo.id ? { ...item, dateOverride } : item)));
                }}
                className="mt-2"
              />
            </div>
          ))}
        </div>
      ) : null}

      <Button size="lg" block type="submit" disabled={photos.length === 0 || isUploading} className="mt-6">
        {isUploading ? "올리는 중..." : "올리기"}
      </Button>
    </form>
  );
}
