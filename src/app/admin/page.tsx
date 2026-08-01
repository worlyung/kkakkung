import { headers } from "next/headers";
import Link from "next/link";
import { BackupSection } from "@/components/BackupSection";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ConfirmForm } from "@/components/ConfirmForm";
import { ScrollRestore } from "@/components/ScrollRestore";
import { ShareLinkActions } from "@/components/ShareLinkActions";
import { UploadForm } from "@/components/UploadForm";
import { koreanAge } from "@/lib/age";
import { countAlbums, getAlbumById, listAlbumPhotos, listDeletedPhotos } from "@/lib/albums";
import { listAlbumChildren } from "@/lib/children";
import { readAlbumSession } from "@/lib/session";
import { getPrivateObjectUrl } from "@/lib/storage";
import { listAlbumViewers } from "@/lib/viewers";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams?: Promise<{ error?: string; uploaded?: string; created?: string; regenerated?: string; spage?: string }>;
};

function formatDate(value: string | null, fallback: string) {
  const date = new Date(value ?? fallback);
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(date);
}

function dateInputValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function getPublicBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("host");
  if (!host) {
    return "";
  }
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const session = await readAlbumSession("admin");
  const album = session ? await getAlbumById(session.albumId) : null;

  if (!album) {
    let hasAlbum = true;
    let environmentError: string | null = null;

    try {
      hasAlbum = (await countAlbums()) > 0;
    } catch (error) {
      environmentError = error instanceof Error ? error.message : "환경변수를 확인해주세요.";
    }

    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-8">
        <section className="rounded-[28px] bg-white p-7 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-widest text-apricot-deep">부모용</p>
          <h1 className="mt-2 text-3xl font-bold">관리 화면</h1>
          <p className="mt-3 text-base leading-7 text-ink-soft">앨범 링크 주소와 부모용 암호를 넣으면 사진을 올릴 수 있어요.</p>

          {environmentError ? (
            <p className="mt-4 rounded-2xl bg-red-50 p-4 text-base font-bold text-red-700">{environmentError}</p>
          ) : null}
          {params?.error ? (
            <p className="mt-4 rounded-2xl bg-red-50 p-4 text-base font-bold text-red-700">{params.error}</p>
          ) : null}

          {hasAlbum ? (
            <form action="/admin/login" method="post" className="mt-6 space-y-4">
              <div>
                <label className="block text-base font-bold" htmlFor="slug">
                  앨범 링크 주소 또는 코드
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="https://.../a/비밀코드"
                  className="mt-2 min-h-12 w-full rounded-2xl border-2 border-line px-4 text-base focus:border-apricot focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-base font-bold" htmlFor="passcode">
                  부모용 암호 4자리
                </label>
                <input
                  id="passcode"
                  name="passcode"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  required
                  className="mt-2 min-h-12 w-full rounded-2xl border-2 border-line px-4 text-center text-2xl tracking-[0.4em] focus:border-apricot focus:outline-none"
                />
              </div>
              <Button size="lg" block type="submit">
                들어가기
              </Button>
            </form>
          ) : (
            <Link
              href="/admin/setup"
              className="cta mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-apricot px-6 text-lg font-bold text-white shadow-soft"
            >
              처음 앨범 만들기
            </Link>
          )}
        </section>
      </main>
    );
  }

  const [photos, children, viewers, deletedPhotos, baseUrl] = await Promise.all([
    listAlbumPhotos(album.id),
    listAlbumChildren(album.id),
    listAlbumViewers(album.id),
    listDeletedPhotos(album.id),
    getPublicBaseUrl(),
  ]);
  const shareUrl = `${baseUrl}/a/${album.share_slug}`;
  const kids = children.map((child) => ({ id: child.id, name: child.name }));
  const backupItems = photos.map((photo) => {
    const when = new Date(photo.taken_at ?? photo.uploaded_at);
    const valid = !Number.isNaN(when.getTime());
    return {
      id: photo.id,
      year: valid ? when.getFullYear() : 0,
      childIds: photo.child_ids?.length ? photo.child_ids : photo.child_id ? [photo.child_id] : [],
      ext: photo.storage_key.split(".").pop() || "jpg",
      taken: valid
        ? `${when.getFullYear()}${String(when.getMonth() + 1).padStart(2, "0")}${String(when.getDate()).padStart(2, "0")}`
        : "unknown",
    };
  });
  // 최근 사진은 12장씩 페이지로 나눈다 (사진이 많아져도 목록이 길어지지 않게).
  const PER_PAGE = 12;
  const totalPhotoPages = Math.max(1, Math.ceil(photos.length / PER_PAGE));
  const photoPage = Math.min(totalPhotoPages, Math.max(1, Number(params?.spage) || 1));
  const photoCards = await Promise.all(
    photos.slice((photoPage - 1) * PER_PAGE, photoPage * PER_PAGE).map(async (photo) => ({
      photo,
      thumbUrl: await getPrivateObjectUrl(photo.thumb_key),
    })),
  );
  const trashCards = await Promise.all(
    deletedPhotos.slice(0, 18).map(async (photo) => ({
      photo,
      thumbUrl: await getPrivateObjectUrl(photo.thumb_key),
    })),
  );

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <ScrollRestore />

      {/* ── 헤더 카드 ── */}
      <section className="rounded-[28px] bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-apricot-deep">부모용 관리</p>
            <h1 className="mt-1 text-3xl font-bold">{album.baby_name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/a/${album.share_slug}`}
              target="_blank"
              rel="noreferrer"
              className="cta inline-flex min-h-10 items-center gap-1.5 rounded-2xl bg-sage px-4 text-base font-bold text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
                <path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </svg>
              가족 화면
            </a>
            <form action="/admin/logout" method="post">
              <Button variant="secondary" size="sm" type="submit">
                나가기
              </Button>
            </form>
          </div>
        </div>

        {/* 알림 메시지 */}
        {params?.created ? (
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-sage-soft px-4 py-3 text-base font-bold text-sage-deep">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 shrink-0" aria-hidden>
              <path d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
            앨범을 만들었어요.
          </p>
        ) : null}
        {params?.uploaded ? (
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-sage-soft px-4 py-3 text-base font-bold text-sage-deep">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 shrink-0" aria-hidden>
              <path d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
            사진을 올렸어요.
          </p>
        ) : null}
        {params?.regenerated ? (
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-apricot-soft px-4 py-3 text-base font-bold text-apricot-deep">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 shrink-0" aria-hidden>
              <path d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0 1 15-3.4M20 15a9 9 0 0 1-15 3.4" />
            </svg>
            새 링크를 만들었어요. 예전 링크는 더 이상 열리지 않아요.
          </p>
        ) : null}
        {params?.error ? (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-base font-bold text-red-700">{params.error}</p>
        ) : null}
      </section>

      {/* ── 사진·영상 올리기 — 가장 많이 쓰니 맨 위 ── */}
      <div className="mt-4">
        <UploadForm kids={kids} />
      </div>

      {/* ── 링크 카드 (복사는 항상 보임) ── */}
      <section className="mt-4 rounded-[28px] bg-white p-6 shadow-soft">
        <h2 className="text-xl font-bold">가족에게 보낼 링크</h2>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-paper-2 px-4 py-3">
          <p className="min-w-0 flex-1 truncate text-base font-bold text-ink">{shareUrl}</p>
        </div>
        <ShareLinkActions shareUrl={shareUrl} />
      </section>

      {/* ── 앨범 이름 ── */}
      <CollapsibleSection title="앨범 이름" storageKey="albumname">
        <p className="text-sm leading-6 text-ink-soft">
          가족 화면 맨 위에 보이는 이름이에요. 아이 이름 대신 원하는 이름(예: 준영이네, 우리 가족)으로 바꿀 수 있어요.
        </p>
        <form action="/admin/settings" method="post" className="mt-3 flex gap-2">
          <input type="hidden" name="op" value="name" />
          <input
            name="babyName"
            defaultValue={album.baby_name}
            maxLength={40}
            required
            aria-label="앨범 이름"
            className="min-h-11 flex-1 rounded-2xl border-2 border-line px-4 text-base focus:border-apricot focus:outline-none"
          />
          <Button type="submit" className="shrink-0">
            저장
          </Button>
        </form>
      </CollapsibleSection>

      {/* ── 링크 설정 (자주 안 써서 접어둠 — 잘못 누름 방지) ── */}
      <CollapsibleSection title="링크 설정 (잘 안 써요)" storageKey="linksettings">
        <div className="grid gap-3 sm:grid-cols-3">
          {/* 링크 새로 만들기 */}
          <div className="rounded-2xl border border-line p-4">
            <p className="text-sm font-bold text-ink">링크 새로 만들기</p>
            <p className="mt-1 text-sm text-ink-soft">링크가 새어나갔을 때만. 지금 링크는 안 열리게 되고 가족에게 새로 보내야 해요.</p>
            <ConfirmForm
              action="/admin/regenerate"
              fields={{}}
              message={"정말 링크를 새로 만들까요?\n\n지금 링크는 바로 열리지 않게 되고, 가족에게 새 링크를 다시 보내야 해요.\n\n링크가 새어나갔을 때만 하세요."}
              className="mt-3 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700"
            >
              링크 새로 만들기
            </ConfirmForm>
          </div>
          {/* 만료 */}
          <div className="rounded-2xl border border-line p-4">
            <p className="text-sm font-bold text-ink">링크 만료</p>
            <p className="mt-1 text-sm text-ink-soft">
              {album.share_expires_at
                ? `${formatDate(album.share_expires_at, album.share_expires_at)}에 만료`
                : "만료 없음 (계속 열려요)"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ["none", "만료 없음"],
                ["30", "30일"],
                ["365", "1년"],
              ].map(([days, label]) => (
                <form key={days} action="/admin/settings" method="post">
                  <input type="hidden" name="op" value="expiry" />
                  <input type="hidden" name="days" value={days} />
                  <button className="rounded-xl border-2 border-line px-3 py-1.5 text-sm font-bold hover:border-apricot hover:text-apricot-deep" type="submit">
                    {label}
                  </button>
                </form>
              ))}
            </div>
          </div>
          {/* 다운로드 */}
          <div className="rounded-2xl border border-line p-4">
            <p className="text-sm font-bold text-ink">사진 저장(다운로드)</p>
            <p className="mt-1 text-sm text-ink-soft">
              {album.downloads_enabled ? "가족이 원본을 저장할 수 있어요." : "저장 버튼 숨김 — 보기만 가능."}
            </p>
            <form action="/admin/settings" method="post" className="mt-3">
              <input type="hidden" name="op" value="downloads" />
              <input type="hidden" name="value" value={album.downloads_enabled ? "off" : "on"} />
              <button
                className={`rounded-xl px-4 py-2 text-sm font-bold ${
                  album.downloads_enabled
                    ? "border-2 border-line text-ink-soft"
                    : "bg-apricot text-white"
                }`}
                type="submit"
              >
                {album.downloads_enabled ? "저장 버튼 끄기" : "저장 버튼 켜기"}
              </button>
            </form>
          </div>
        </div>
      </CollapsibleSection>

      {/* ── 백업 (사진·영상 내려받기) ── */}
      {backupItems.length > 0 ? (
        <CollapsibleSection title="백업 (사진 내려받기)" storageKey="backup">
          <BackupSection slug={album.share_slug} items={backupItems} kids={kids} />
        </CollapsibleSection>
      ) : null}

      {/* ── 아이 관리 ── */}
      <CollapsibleSection title="아이" storageKey="children">
        <p className="text-sm leading-6 text-ink-soft">
          아이를 등록하면 나이가 자동으로 표시되고, 아이가 둘 이상이면 골라보기 필터가 생겨요.
        </p>
        {children.length > 0 ? (
          <ul className="mt-4 divide-y divide-line">
            {children.map((child) => {
              const age = koreanAge(child.birthdate);
              return (
                <li key={child.id} className="py-3 first:pt-0 last:pb-0">
                  <form action="/admin/children" method="post" className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="op" value="edit" />
                    <input type="hidden" name="id" value={child.id} />
                    <div className="min-w-[120px] flex-1">
                      <span className="block text-xs font-bold text-ink-soft">이름</span>
                      <input
                        name="name"
                        defaultValue={child.name}
                        maxLength={40}
                        required
                        aria-label="아이 이름"
                        className="mt-1 min-h-10 w-full rounded-xl border-2 border-line px-3 text-base focus:border-apricot focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-ink-soft">생일</span>
                      <input
                        type="date"
                        name="birthdate"
                        defaultValue={child.birthdate ?? ""}
                        aria-label="아이 생일"
                        className="mt-1 min-h-10 rounded-xl border-2 border-line px-3 text-base focus:border-apricot focus:outline-none"
                      />
                    </div>
                    <Button size="sm" type="submit">
                      저장
                    </Button>
                  </form>
                  <div className="mt-1.5 flex items-center justify-between px-0.5">
                    <span className="text-xs text-ink-soft">{age ?? "생일 없음"}</span>
                    <form action="/admin/children" method="post">
                      <input type="hidden" name="op" value="delete" />
                      <input type="hidden" name="id" value={child.id} />
                      <button className="text-xs font-bold text-ink-soft underline" type="submit">
                        지우기
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
        <form action="/admin/children" method="post" className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
          <div className="flex-1">
            <label className="block text-sm font-bold" htmlFor="child-name">
              이름
            </label>
            <input
              id="child-name"
              name="name"
              type="text"
              required
              maxLength={40}
              placeholder="예: 준영"
              className="mt-1 min-h-11 w-full rounded-2xl border-2 border-line px-4 text-base focus:border-apricot focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold" htmlFor="child-birthdate">
              생일 (선택)
            </label>
            <input
              id="child-birthdate"
              name="birthdate"
              type="date"
              className="mt-1 min-h-11 rounded-2xl border-2 border-line px-4 text-base focus:border-apricot focus:outline-none"
            />
          </div>
          <Button type="submit">
            추가
          </Button>
        </form>
      </CollapsibleSection>

      {/* ── 가족 목록 ── */}
      <CollapsibleSection title="가족 (누구세요? 목록)" storageKey="viewers">
        <p className="text-sm leading-6 text-ink-soft">
          여기 등록한 이름이, 조부모님이 처음 들어올 때 고르는 목록이 돼요.
        </p>
        {viewers.length > 0 ? (
          <ul className="mt-4 divide-y divide-line">
            {viewers.map((viewer) => (
              <li key={viewer.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                <form action="/admin/viewers" method="post" className="flex flex-1 items-center gap-2">
                  <input type="hidden" name="op" value="edit" />
                  <input type="hidden" name="id" value={viewer.id} />
                  <input
                    name="name"
                    defaultValue={viewer.name}
                    maxLength={40}
                    required
                    aria-label="가족 이름"
                    className="min-h-10 flex-1 rounded-xl border-2 border-line px-3 text-base focus:border-apricot focus:outline-none"
                  />
                  <Button size="sm" type="submit">
                    저장
                  </Button>
                </form>
                <form action="/admin/viewers" method="post">
                  <input type="hidden" name="op" value="delete" />
                  <input type="hidden" name="id" value={viewer.id} />
                  <Button
                    variant="secondary"
                    size="sm"
                    type="submit"
                    aria-label={`${viewer.name} 지우기`}
                  >
                    지우기
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
        <form action="/admin/viewers" method="post" className="mt-4 flex items-end gap-3 border-t border-line pt-4">
          <div className="flex-1">
            <label className="block text-sm font-bold" htmlFor="viewer-name">
              가족 이름
            </label>
            <input
              id="viewer-name"
              name="name"
              type="text"
              required
              maxLength={40}
              placeholder="예: 외할머니"
              className="mt-1 min-h-11 w-full rounded-2xl border-2 border-line px-4 text-base focus:border-apricot focus:outline-none"
            />
          </div>
          <Button type="submit">
            추가
          </Button>
        </form>
      </CollapsibleSection>

      {/* ── 최근 사진 ── */}
      <CollapsibleSection title="최근 사진" storageKey="photos">
        <p className="text-sm leading-6 text-ink-soft">
          메모·날짜·아이를 고치고 <b>저장</b>을 누르세요. 사진을 지우려면 빨간 <b>삭제</b>를 누르면 돼요. 실수로 지워도 아래 휴지통에서 되살릴 수 있어요.
        </p>
        {photoCards.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-4 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10 text-line" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <p className="text-base text-ink-soft">아직 사진이 없어요.</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photoCards.map(({ photo, thumbUrl }) => (
              <figure key={photo.id} className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbUrl} alt={photo.caption ?? "올린 사진"} loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
                <figcaption className="space-y-2 p-3">
                  {/* 편집 폼 */}
                  <form action="/admin/photos" method="post" className="space-y-2">
                    <input type="hidden" name="op" value="edit" />
                    <input type="hidden" name="id" value={photo.id} />
                    <input
                      name="caption"
                      defaultValue={photo.caption ?? ""}
                      maxLength={120}
                      placeholder="한 줄 메모"
                      aria-label="메모"
                      className="min-h-9 w-full rounded-xl border border-line px-2 text-sm focus:border-apricot focus:outline-none"
                    />
                    <input
                      type="date"
                      name="takenAt"
                      defaultValue={dateInputValue(photo.taken_at ?? photo.uploaded_at)}
                      aria-label="찍은 날짜"
                      className="min-h-9 w-full rounded-xl border border-line px-2 text-sm focus:border-apricot focus:outline-none"
                    />
                    {kids.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line px-2 py-1.5">
                        <span className="text-xs font-semibold text-ink-soft">누구:</span>
                        {kids.map((kid) => {
                          const checked = photo.child_ids?.length
                            ? photo.child_ids.includes(kid.id)
                            : photo.child_id === kid.id;
                          return (
                            <label key={kid.id} className="flex items-center gap-1 text-sm">
                              <input
                                type="checkbox"
                                name="childId"
                                value={kid.id}
                                defaultChecked={checked}
                                className="h-4 w-4 accent-apricot"
                              />
                              {kid.name}
                            </label>
                          );
                        })}
                        <span className="text-xs text-ink-soft">(안 고르면 온 가족)</span>
                      </div>
                    ) : null}
                    <Button size="sm" block type="submit">
                      저장
                    </Button>
                  </form>

                  {/* 표지 지정 */}
                  {album.cover_photo_id === photo.id ? (
                    <form action="/admin/photos" method="post">
                      <input type="hidden" name="op" value="uncover" />
                      <button
                        className="w-full rounded-xl border-2 border-apricot bg-apricot-soft py-1.5 text-xs font-bold text-apricot-deep"
                        type="submit"
                      >
                        ★ 표지 (해제)
                      </button>
                    </form>
                  ) : (
                    <form action="/admin/photos" method="post">
                      <input type="hidden" name="op" value="cover" />
                      <input type="hidden" name="id" value={photo.id} />
                      <Button variant="secondary" size="sm" block type="submit">
                        ☆ 표지로 지정
                      </Button>
                    </form>
                  )}

                  {/* 삭제 */}
                  <form action="/admin/photos" method="post">
                    <input type="hidden" name="op" value="trash" />
                    <input type="hidden" name="id" value={photo.id} />
                    <Button variant="danger" size="sm" block type="submit">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
                        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                      </svg>
                      삭제
                    </Button>
                  </form>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        {totalPhotoPages > 1 ? (
          <div className="mt-5 flex items-center justify-center gap-4">
            {photoPage > 1 ? (
              <Link
                href={`?spage=${photoPage - 1}`}
                scroll={false}
                className="rounded-xl border-2 border-line bg-white px-4 py-2 text-base font-bold text-ink"
              >
                ‹ 이전
              </Link>
            ) : (
              <span className="rounded-xl border-2 border-line px-4 py-2 text-base font-bold text-ink-soft/40">‹ 이전</span>
            )}
            <span className="text-base font-bold text-ink">
              {photoPage} / {totalPhotoPages}
            </span>
            {photoPage < totalPhotoPages ? (
              <Link
                href={`?spage=${photoPage + 1}`}
                scroll={false}
                className="rounded-xl border-2 border-line bg-white px-4 py-2 text-base font-bold text-ink"
              >
                다음 ›
              </Link>
            ) : (
              <span className="rounded-xl border-2 border-line px-4 py-2 text-base font-bold text-ink-soft/40">다음 ›</span>
            )}
          </div>
        ) : null}
      </CollapsibleSection>

      {/* ── 휴지통 ── */}
      {trashCards.length > 0 ? (
        <CollapsibleSection title={`휴지통 (${trashCards.length}장)`} storageKey="trash" dashed>
          <p className="text-sm leading-6 text-ink-soft">
            지운 사진이에요. 되살리거나 완전히 지울 수 있어요. 완전히 지우면 되돌릴 수 없어요.
          </p>
          <div className="mt-3">
            <ConfirmForm
              action="/admin/photos"
              fields={{ op: "purgeAll" }}
              message={`휴지통의 사진 ${trashCards.length}장을 완전히 지울까요?\n\n한 번 지우면 되돌릴 수 없어요.`}
              className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700"
            >
              휴지통 전체 비우기
            </ConfirmForm>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {trashCards.map(({ photo, thumbUrl }) => (
              <figure key={photo.id} className="overflow-hidden rounded-2xl border border-line bg-paper-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbUrl} alt={photo.caption ?? "지운 사진"} loading="lazy" decoding="async" className="aspect-square w-full object-cover opacity-60" />
                <figcaption className="space-y-2 p-3">
                  {photo.caption ? <span className="block text-xs font-bold text-ink">{photo.caption}</span> : null}
                  <form action="/admin/photos" method="post">
                    <input type="hidden" name="op" value="restore" />
                    <input type="hidden" name="id" value={photo.id} />
                    <button className="w-full rounded-xl bg-sage px-3 py-1.5 text-xs font-bold text-white" type="submit">
                      되살리기
                    </button>
                  </form>
                  <ConfirmForm
                    action="/admin/photos"
                    fields={{ op: "purge", id: photo.id }}
                    message={"이 사진을 완전히 지울까요?\n\n한 번 지우면 되돌릴 수 없어요."}
                    className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700"
                  >
                    완전히 지우기
                  </ConfirmForm>
                </figcaption>
              </figure>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}
    </main>
  );
}
