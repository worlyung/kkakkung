import { AlbumGallery, type GalleryGroup, type GalleryPhoto } from "@/components/AlbumGallery";
import { InstallButton } from "@/components/InstallButton";
import { ReplyNotices, type ReplyNotice } from "@/components/ReplyNotices";
import { Button } from "@/components/ui/Button";
import { koreanAge } from "@/lib/age";
import { getAlbumBySlug, listAlbumPhotos } from "@/lib/albums";
import { listAlbumChildren } from "@/lib/children";
import { listAlbumComments } from "@/lib/comments";
import { isVideoMime } from "@/lib/photos";
import { listAlbumReactionCounts, listViewerReactions } from "@/lib/reactions";
import { hasAlbumSession, readViewerIdentity } from "@/lib/session";
import { getPrivateDownloadUrl, getPrivateObjectUrl } from "@/lib/storage";
import { listAlbumViewers, markRepliesChecked, touchViewer } from "@/lib/viewers";
import type { Metadata } from "next";
import type { Album } from "@/types/database";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { manifest: `/a/${slug}/manifest.webmanifest` };
}

type ViewerPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ error?: string }>;
};

type PhotoCard = GalleryPhoto;

function downloadName(babyName: string, when: string, storageKey: string): string {
  const ext = storageKey.split(".").pop() || "jpg";
  const date = new Date(when);
  const stamp = Number.isNaN(date.getTime())
    ? "photo"
    : `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `${babyName}_${stamp}.${ext}`;
}

function formatDate(value: string | null, fallback: string): string {
  const date = new Date(value ?? fallback);
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "full" }).format(date);
}

function groupPhotos(photos: PhotoCard[]) {
  return photos.reduce<GalleryGroup[]>((groups, photo) => {
    const last = groups.at(-1);
    if (last?.label === photo.dateLabel) {
      last.photos.push(photo);
    } else {
      groups.push({ label: photo.dateLabel, photos: [photo] });
    }
    return groups;
  }, []);
}

function LockChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      우리 가족만
    </span>
  );
}

/** 오류/만료 등 전체화면 안내 */
function FullPageMessage({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-5 py-12 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-apricot-soft text-apricot-deep">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-8 w-8" aria-hidden>
          <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      </div>
      <p className="text-sm font-bold uppercase tracking-widest text-apricot-deep">까꿍</p>
      <h1 className="mt-3 text-3xl font-bold leading-tight">{title}</h1>
      <p className="mt-4 text-lg leading-8 text-ink-soft">{body}</p>
    </main>
  );
}

function WhoPicker({ album, viewers }: { album: Album; viewers: { id: string; name: string }[] }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-12">
      <section className="rounded-[28px] bg-white p-8 text-center shadow-soft">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-apricot-soft text-apricot-deep">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-8 w-8" aria-hidden>
            <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </div>
        <p className="text-sm font-bold uppercase tracking-widest text-apricot-deep">가족 전용</p>
        <h1 className="mt-2 text-3xl font-bold">{album.baby_name}</h1>
        <p className="mt-3 text-lg leading-7 text-ink-soft">가족만 보는 사진첩이에요.</p>

        <p className="mt-7 text-lg font-bold text-sage-deep">누구세요?</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {viewers.map((viewer) => (
            <form key={viewer.id} action={`/a/${album.share_slug}/who`} method="post">
              <input type="hidden" name="viewerId" value={viewer.id} />
              <button
                type="submit"
                className="min-h-14 rounded-3xl border-2 border-line bg-white px-7 text-xl font-bold text-ink shadow-soft transition-shadow hover:shadow-md"
              >
                {viewer.name}
              </button>
            </form>
          ))}
        </div>
        <p className="mt-6 text-sm leading-6 text-ink-soft">한 번 고르면 이 폰이 기억해요.</p>
      </section>
    </main>
  );
}

export default async function ViewerPage({ params, searchParams }: ViewerPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const album = await getAlbumBySlug(slug);

  if (!album) {
    return (
      <FullPageMessage
        title="링크가 열리지 않아요"
        body="링크가 바뀌었거나 주소가 잘못됐어요. 가족에게 새 링크를 다시 받아주세요."
      />
    );
  }

  if (album.share_expires_at && new Date(album.share_expires_at).getTime() < Date.now()) {
    return (
      <FullPageMessage
        title="링크가 만료됐어요"
        body="이 링크는 기간이 지나 더 이상 열리지 않아요. 가족에게 새 링크를 받아주세요."
      />
    );
  }

  const viewerUnlocked = await hasAlbumSession(album.id, "viewer");
  const isAdmin = await hasAlbumSession(album.id, "admin");
  // 부모(관리자)는 암호 없이 미리보기. 가족처럼 이름 고르기·하트·한마디는 안 함.
  const previewMode = isAdmin && !viewerUnlocked;

  if (!viewerUnlocked && !isAdmin) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-12">
        <section className="rounded-[28px] bg-white p-8 shadow-soft">
          {/* 아이콘 */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-apricot-soft text-apricot-deep">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-8 w-8" aria-hidden>
              <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          <p className="text-center text-sm font-bold uppercase tracking-widest text-apricot-deep">가족 전용</p>
          <h1 className="mt-2 text-center text-3xl font-bold">{album.baby_name}</h1>
          <p className="mt-4 text-center text-base leading-7 text-ink-soft">
            처음 한 번만 암호 4자리를 넣어주세요.<br />이 폰에서 30일 동안 기억할게요.
          </p>

          <form action={`/a/${album.share_slug}/unlock`} method="post" className="mt-7 space-y-4">
            <div>
              <label className="block text-base font-bold" htmlFor="passcode">
                암호 4자리
              </label>
              {/* 오류 메시지를 입력창 바로 위에 */}
              {query?.error ? (
                <p className="mt-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">
                  {query.error}
                </p>
              ) : null}
              <input
                id="passcode"
                name="passcode"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                autoComplete="one-time-code"
                required
                autoFocus
                className="mt-2 min-h-16 w-full rounded-2xl border-2 border-line bg-paper-2 px-4 text-center text-4xl tracking-[0.5em] focus:border-apricot focus:outline-none"
              />
              <p className="mt-1.5 text-center text-xs text-ink-soft">숫자 4자리</p>
            </div>
            <Button size="lg" block type="submit">
              사진 보기
            </Button>
          </form>
        </section>
      </main>
    );
  }

  const [photos, children, viewers, identityId, commentsByPhoto, reactionCounts] = await Promise.all([
    listAlbumPhotos(album.id),
    listAlbumChildren(album.id),
    listAlbumViewers(album.id),
    readViewerIdentity(album.id),
    listAlbumComments(album.id),
    listAlbumReactionCounts(album.id),
  ]);

  const me = viewerUnlocked && identityId ? viewers.find((viewer) => viewer.id === identityId) ?? null : null;

  // 등록된 가족이 있는데 아직 누군지 안 골랐으면 "누구세요?" 화면. (부모 미리보기는 건너뜀)
  if (viewers.length > 0 && !me && !previewMode) {
    return <WhoPicker album={album} viewers={viewers.map((viewer) => ({ id: viewer.id, name: viewer.name }))} />;
  }

  const myReactions = me ? await listViewerReactions(album.id, me.id) : new Set<string>();

  // 오늘(한국 시간) 다녀간 다른 가족 (나 제외). 서버는 UTC라 KST 날짜로 비교한다.
  const kstDay = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short" });
  const today = kstDay.format(new Date());
  const todayViewers = viewers
    .filter(
      (viewer) =>
        viewer.last_seen_at && viewer.id !== me?.id && kstDay.format(new Date(viewer.last_seen_at)) === today,
    )
    .sort((a, b) => new Date(b.last_seen_at ?? 0).getTime() - new Date(a.last_seen_at ?? 0).getTime());

  // 내가 봤다는 표시 남기기
  if (me) {
    await touchViewer(me.id);
  }

  // 다른 가족이 남긴 새 한마디·답글 알림 (내가 마지막으로 확인한 뒤의 것만)
  const replyNotices: ReplyNotice[] = [];
  if (me) {
    if (!me.replies_checked_at) {
      // 처음엔 기준점만 잡는다 — 예전에 쌓인 한마디가 첫 방문에 와르르 뜨지 않게.
      await markRepliesChecked(album.id, me.id);
    } else {
      const checkedAt = new Date(me.replies_checked_at).getTime();
      const allComments = [...commentsByPhoto.values()].flat();
      const bodyById = new Map(allComments.map((c) => [c.id, c.body]));
      for (const comment of allComments) {
        if (comment.viewerId !== me.id && new Date(comment.createdAt).getTime() > checkedAt) {
          replyNotices.push({
            photoId: comment.photoId,
            name: comment.name,
            body: comment.body,
            repliedTo: comment.parentId ? bodyById.get(comment.parentId) ?? null : null,
            createdAt: comment.createdAt,
          });
        }
      }
      replyNotices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // 최신부터
    }
  }

  const childInfo = new Map(children.map((child) => [child.id, { name: child.name, age: koreanAge(child.birthdate) }]));

  // 같은 키의 서명 URL을 중복 생성하지 않도록 캐시한다.
  // (getPrivateObjectUrl은 1시간 창 고정이라 같은 키면 같은 URL이 나온다.)
  const urlCache = new Map<string, Promise<string>>();
  const signedUrl = (key: string) => {
    const cached = urlCache.get(key);
    if (cached) {
      return cached;
    }
    const created = getPrivateObjectUrl(key);
    urlCache.set(key, created);
    return created;
  };

  const photoCards: PhotoCard[] = await Promise.all(
    photos.map(async (photo) => {
      // child_ids(배열)가 실제 태그. 예전 데이터 대비 child_id도 폴백으로 본다.
      const ids = photo.child_ids?.length ? photo.child_ids : photo.child_id ? [photo.child_id] : [];
      const infos = ids.map((cid) => childInfo.get(cid)).filter((v): v is { name: string; age: string | null } => Boolean(v));
      const isVideo = isVideoMime(photo.mime_type);
      return {
        id: photo.id,
        caption: photo.caption,
        dateLabel: formatDate(photo.taken_at, photo.uploaded_at),
        thumbUrl: await signedUrl(photo.thumb_key),
        // 사진 크게 보기는 썸네일로 — 속도 우선. 원본은 다운로드에서만.
        viewUrl: await signedUrl(photo.thumb_key),
        // 영상은 크게 보기에서 원본을 재생한다.
        videoUrl: isVideo ? await signedUrl(photo.storage_key) : null,
        isVideo,
        downloadUrl: await getPrivateDownloadUrl(
          photo.storage_key,
          downloadName(album.baby_name, photo.taken_at ?? photo.uploaded_at, photo.storage_key),
        ),
        width: photo.width,
        height: photo.height,
        childIds: ids,
        // 표시용: 여러 명이면 "하윤·도윤", 나이는 한 명일 때만.
        childName: infos.length > 0 ? infos.map((i) => i.name).join("·") : null,
        childAge: infos.length === 1 ? infos[0].age : null,
        comments: commentsByPhoto.get(photo.id) ?? [],
        reactionCount: reactionCounts.get(photo.id) ?? 0,
        iReacted: myReactions.has(photo.id),
        dateValue: photo.taken_at ?? photo.uploaded_at,
      };
    }),
  );
  const groups: GalleryGroup[] = groupPhotos(photoCards);
  // 부모가 표지 사진을 지정했으면 그걸, 아니면 가장 최근 사진을 표지로.
  const cover = (album.cover_photo_id ? photoCards.find((photo) => photo.id === album.cover_photo_id) : null) ?? photoCards[0];
  const kids = children.map((child) => ({ id: child.id, name: child.name }));
  const coverAge =
    children.length === 1
      ? koreanAge(children[0].birthdate)
      : children.length >= 2
        ? children
            .map((child) => {
              const age = koreanAge(child.birthdate);
              return age ? `${child.name} ${age}` : child.name;
            })
            .join(" · ")
        : null;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-3 pb-12">
      {/* 미리보기 배너 */}
      {previewMode ? (
        <div className="mx-1 mt-3 flex items-center justify-between gap-3 rounded-2xl bg-sage-soft px-4 py-3">
          <p className="text-sm font-bold text-sage-deep">미리보기 — 가족은 이렇게 봐요</p>
          <a href="/admin" className="cta shrink-0 rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-sage-deep shadow-sm">
            관리로 돌아가기
          </a>
        </div>
      ) : null}

      {/* 내 한마디에 새 답글이 왔으면 맨 위에 알려준다 */}
      {replyNotices.length > 0 ? <ReplyNotices slug={album.share_slug} notices={replyNotices} /> : null}

      {/* 헤더 — 왼쪽은 까꿍 브랜드, 오른쪽은 최근 다녀간 가족 이름 */}
      <header className="flex items-center justify-between gap-2 px-2 pb-2 pt-4">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="" width={28} height={28} className="h-7 w-7 rounded-lg" />
          <p className="text-base font-bold text-apricot-deep">까꿍</p>
          {me ? (
            <span className="shrink-0 rounded-full bg-paper-2 px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
              {me.name}
            </span>
          ) : null}
        </div>
        {todayViewers.length > 0 ? (
          <p className="min-w-0 truncate text-right text-xs leading-5 text-ink-soft">
            <span className="font-bold text-sage-deep">{todayViewers.map((viewer) => viewer.name).join("·")}</span>
            {" 오늘 다녀감"}
          </p>
        ) : null}
      </header>

      {/* 커버 이미지 — 더 크게 (h-72 → h-80) */}
      {cover ? (
        <div className="relative mx-1 mt-1 h-80 overflow-hidden rounded-[22px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover.thumbUrl} alt={album.baby_name} fetchPriority="high" className="h-full w-full object-cover" />
          <div className="absolute left-3 top-3">
            <LockChip />
          </div>
          {/* 그라디언트 오버레이 */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-5">
            <h1 className="text-4xl font-bold text-white drop-shadow-md">{album.baby_name}</h1>
            {coverAge ? <p className="mt-1.5 text-sm font-semibold text-white/90 drop-shadow">{coverAge}</p> : null}
          </div>
        </div>
      ) : (
        <div className="relative mx-1 mt-1 flex h-56 flex-col items-center justify-center rounded-[22px] bg-paper-2 text-center">
          <div className="absolute left-3 top-3">
            <LockChip />
          </div>
          <h1 className="text-3xl font-bold">{album.baby_name}</h1>
          {coverAge ? <p className="mt-1 text-base font-semibold text-ink-soft">{coverAge}</p> : null}
        </div>
      )}

      {/* 홈 화면 바로가기 추가 (설치 가능한 기기에서만 표시) */}
      <InstallButton />

      {/* 사진 없음 */}
      {groups.length === 0 ? (
        <section className="mx-1 mt-6 rounded-[22px] bg-white p-8 text-center shadow-soft">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-4 h-12 w-12 text-line" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <h2 className="text-2xl font-bold">아직 사진이 없어요</h2>
          <p className="mt-3 text-lg leading-8 text-ink-soft">사진이 올라오면 이 화면에 바로 보여요.</p>
        </section>
      ) : (
        <AlbumGallery
          groups={groups}
          kids={kids}
          slug={album.share_slug}
          canComment={!!me}
          downloadsEnabled={album.downloads_enabled}
        />
      )}
    </main>
  );
}
