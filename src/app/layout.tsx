import type { Metadata, Viewport } from "next";
import { ViewSettings } from "@/components/ViewSettings";
import "./globals.css";

export const metadata: Metadata = {
  title: "까꿍",
  description: "가족 전용 사진 공간",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  // 아이폰에서 홈 화면에 추가하면 전체화면 앱처럼 열린다.
  appleWebApp: {
    capable: true,
    title: "까꿍",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#E8894C",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <ViewSettings />
      </body>
    </html>
  );
}
