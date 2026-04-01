import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI相性占い | 8占術で本気診断",
  description: "恋愛・結婚・仕事・SEXの相性をClaudeが8つの占術で完全分析。1回300円。",
  openGraph: {
    title: "AI相性占い | 8占術で本気診断",
    description: "恋愛・結婚・仕事・SEXの相性をAIが本気で占います",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
