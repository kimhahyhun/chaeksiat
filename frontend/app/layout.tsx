import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "책씨앗 | 아이의 독서 습관을 키워요",
  description: "아이의 독서 이력을 기반으로 맞춤 도서를 추천하는 성장 플랫폼",
  manifest: "/manifest.json",
  themeColor: "#22c55e",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-seed-50">{children}</body>
    </html>
  );
}
