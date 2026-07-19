import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 앨범마다 홈 화면 바로가기의 시작 주소를 그 앨범으로 맞춘 manifest.
// (안드로이드는 이 start_url을 쓰므로, 홈 아이콘을 누르면 바로 자기 앨범이 열린다.)
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return NextResponse.json(
    {
      name: "까꿍",
      short_name: "까꿍",
      description: "우리 가족 사진첩",
      start_url: `/a/${slug}`,
      scope: `/a/${slug}`,
      display: "standalone",
      background_color: "#FFFDF9",
      theme_color: "#E8894C",
      icons: [{ src: "/icon.png", sizes: "any", type: "image/png", purpose: "any" }],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
