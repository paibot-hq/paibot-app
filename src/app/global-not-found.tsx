import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "404 | PAIBOT.app", robots: { index: false, follow: false } };
export default function GlobalNotFound() {
  return (
    <html lang="ja"><body><main className="section">
      <h1>404</h1><p>ページが見つかりません。</p><p lang="en">Page not found.</p>
      <p><a href="/ja">日本語トップ</a> / <a href="/en" lang="en">English home</a></p>
    </main></body></html>
  );
}
