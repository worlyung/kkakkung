import Link from "next/link";

const POINTS = [
  "앱 설치도, 회원가입도 없이",
  "문자 링크 + 암호 4자리 한 번만",
  "검색에도 안 뜨는 완전 비공개",
];

export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center overflow-hidden px-6 py-12 text-center">
      {/* 은은한 배경 장식 */}
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-apricot-soft/60 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-sage-soft/60 blur-3xl" />

      {/* 로고 — 까꿍! 하고 떠오른 뒤 둥실 */}
      <div className="anim-pop relative z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon.png"
          alt="까꿍"
          width={104}
          height={104}
          className="anim-float rounded-[30px] shadow-soft ring-1 ring-line"
          style={{ height: 104, width: 104 }}
        />
      </div>

      {/* 브랜드 */}
      <h1 className="anim-up relative z-10 mt-6 text-5xl font-black tracking-tight text-ink" style={{ animationDelay: "0.15s" }}>
        까꿍
      </h1>
      <p className="anim-up relative z-10 mt-2.5 text-lg font-bold text-apricot-deep" style={{ animationDelay: "0.25s" }}>
        우리 아기, 우리 가족만의 사진첩
      </p>
      <p className="anim-up relative z-10 mt-3 text-base leading-7 text-ink-soft" style={{ animationDelay: "0.35s" }}>
        초대받은 가족만 비밀 링크와 암호로 볼 수 있어요.
      </p>

      {/* 특징 */}
      <ul className="relative z-10 mt-7 w-full space-y-2.5 text-left">
        {POINTS.map((text, i) => (
          <li
            key={text}
            className="anim-up flex items-center gap-3 rounded-2xl bg-white/75 px-4 py-3 shadow-sm backdrop-blur-sm"
            style={{ animationDelay: `${0.45 + i * 0.1}s` }}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-soft text-sage-deep">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4" aria-hidden>
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-ink">{text}</span>
          </li>
        ))}
      </ul>

      {/* 관리자 버튼 */}
      <Link
        href="/admin"
        className="cta anim-up relative z-10 mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-apricot px-6 text-lg font-bold text-white shadow-soft"
        style={{ animationDelay: "0.8s" }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
          <path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z" />
        </svg>
        부모용 관리 화면
      </Link>

      <p className="anim-up relative z-10 mt-4 text-xs leading-5 text-ink-soft/80" style={{ animationDelay: "0.9s" }}>
        가족이라면 문자로 받은 링크를 눌러 들어오세요.
      </p>
    </main>
  );
}
