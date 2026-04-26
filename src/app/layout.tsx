import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "交易来时路 · 你的交易档案",
  description: "用AI蒸馏你的交易历史，回望你走过的每一步。输入你的 Hyperliquid 地址，获取专属交易人格测评报告。",
  openGraph: {
    title: "交易来时路",
    description: "用AI蒸馏你的交易历史，照出你是什么档次的交易猫",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
