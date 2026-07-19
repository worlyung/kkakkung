import Link from "next/link";
import { countAlbums } from "@/lib/albums";
import { getInitialSetupKey } from "@/lib/env";

export const dynamic = "force-dynamic";

type SetupPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const params = await searchParams;
  const setupKeyConfigured = Boolean(getInitialSetupKey());
  let albumCount: number | null = null;
  let environmentError: string | null = null;

  try {
    albumCount = await countAlbums();
  } catch (error) {
    environmentError = error instanceof Error ? error.message : "환경변수를 확인해주세요.";
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 py-8">
      <Link href="/admin" className="text-lg font-bold text-amber-700">
        ← 관리 화면
      </Link>
      <section className="mt-6 rounded-3xl bg-white p-6 shadow-soft">
        <p className="text-lg font-semibold text-amber-700">처음 한 번만</p>
        <h1 className="mt-2 text-3xl font-bold">앨범 만들기</h1>
        <p className="mt-4 text-lg leading-8 text-slate-700">
          실제 가족 정보는 코드에 넣지 않고, 배포 환경에서 직접 입력해요.
        </p>

        {environmentError ? (
          <p className="mt-5 rounded-2xl bg-red-50 p-4 text-lg font-bold text-red-700">{environmentError}</p>
        ) : null}

        {!setupKeyConfigured ? (
          <p className="mt-5 rounded-2xl bg-red-50 p-4 text-lg font-bold text-red-700">
            INITIAL_SETUP_KEY 환경변수를 먼저 설정해주세요.
          </p>
        ) : null}

        {albumCount !== null && albumCount > 0 ? (
          <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-lg font-bold text-emerald-800">
            이미 앨범이 만들어져 있어요. 보안을 위해 추가 설정은 막았습니다.
          </p>
        ) : null}

        {params?.error ? <p className="mt-5 rounded-2xl bg-red-50 p-4 text-lg font-bold text-red-700">{params.error}</p> : null}

        {setupKeyConfigured && albumCount === 0 ? (
          <form action="/admin/setup/create" method="post" className="mt-6 space-y-5">
            <div>
              <label className="block text-lg font-bold" htmlFor="setupKey">
                설정 키
              </label>
              <input
                id="setupKey"
                name="setupKey"
                type="password"
                required
                className="mt-2 min-h-12 w-full rounded-2xl border-2 border-slate-300 px-4 text-xl"
              />
            </div>
            <div>
              <label className="block text-lg font-bold" htmlFor="babyName">
                화면에 표시할 앨범 이름
              </label>
              <input
                id="babyName"
                name="babyName"
                type="text"
                required
                maxLength={80}
                placeholder="예: 아기 사진"
                className="mt-2 min-h-12 w-full rounded-2xl border-2 border-slate-300 px-4 text-xl"
              />
            </div>
            <div>
              <label className="block text-lg font-bold" htmlFor="viewerPasscode">
                가족용 암호 4자리
              </label>
              <input
                id="viewerPasscode"
                name="viewerPasscode"
                inputMode="numeric"
                pattern="[0-9]{4}"
                required
                className="mt-2 min-h-12 w-full rounded-2xl border-2 border-slate-300 px-4 text-xl"
              />
            </div>
            <div>
              <label className="block text-lg font-bold" htmlFor="adminPasscode">
                부모용 암호 4자리
              </label>
              <input
                id="adminPasscode"
                name="adminPasscode"
                inputMode="numeric"
                pattern="[0-9]{4}"
                required
                className="mt-2 min-h-12 w-full rounded-2xl border-2 border-slate-300 px-4 text-xl"
              />
            </div>
            <button className="min-h-12 w-full rounded-2xl bg-slate-900 px-6 text-xl font-bold text-white shadow-soft" type="submit">
              앨범 만들기
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
