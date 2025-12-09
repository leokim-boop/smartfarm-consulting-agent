import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "팜비트 - 실내 스마트팜 자동견적",
  description: "AI 기반 실내 스마트팜 자동견적 및 비즈니스 리포트 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

