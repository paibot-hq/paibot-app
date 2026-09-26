"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "../i18n/navigation";
import { Show, UserButton } from "@clerk/react-router";
import { type Locale } from "../i18n/routing";
import { useTranslations, useLocale } from "use-intl";
import { usePathname } from "../i18n/navigation";
import { usePreferences } from "./providers";

export default function Header() {
  const language = useLocale() as Locale;
  const pathname = usePathname();
  const t = useTranslations("App");
  const { resolvedTheme, toggleTheme } = usePreferences();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const languageButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(event: MouseEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        languageButtonRef.current?.focus();
      }
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);


  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <img className="brand-logo" src="/icon.svg" alt="" width="24" height="24" />
        <span className="wordmark">PAIBOT</span><span className="brand-suffix">.app</span>
      </Link>
      <nav aria-label={t("navApps")}>
        <Link href="/apps">{t("navApps")}</Link>
        <Link href="/about">{t("navAbout")}</Link>
      </nav>
      <div className="toolbar">
        <Show when="signed-out">
          <Link className="auth-link" href={`/sign-in?redirect_url=${encodeURIComponent(`/${language}${pathname === "/" ? "" : pathname}`)}`}>{t("signIn")}</Link>
          <Link className="auth-link" href={`/sign-up?redirect_url=${encodeURIComponent(`/${language}${pathname === "/" ? "" : pathname}`)}`}>{t("signUp")}</Link>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
        <div className="language-menu" ref={menuRef}>
          <button ref={languageButtonRef} className="language-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={t("languageSelect")} aria-expanded={menuOpen} aria-controls="language-options">
            <svg className="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21M12 3c-2.4 2.5-3.6 5.5-3.6 9s1.2 6.5 3.6 9" />
            </svg>
          </button>
          <div className="language-options" id="language-options" role="menu" hidden={!menuOpen}>
            <Link href={pathname} locale="ja" role="menuitem" aria-current={language === "ja" ? "page" : undefined} onClick={() => setMenuOpen(false)}>日本語</Link>
            <Link href={pathname} locale="en" role="menuitem" aria-current={language === "en" ? "page" : undefined} onClick={() => setMenuOpen(false)}>English</Link>
            <Link href={pathname} locale="zh" role="menuitem" aria-current={language === "zh" ? "page" : undefined} onClick={() => setMenuOpen(false)}>简体中文</Link>
          </div>
        </div>
        <button className="theme-toggle" type="button" onClick={toggleTheme} aria-pressed={resolvedTheme === "dark"} aria-label={resolvedTheme === "dark" ? t("themeToLight") : t("themeToDark")}>
          <svg className="toolbar-icon theme-icon theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.5 14.6A7.8 7.8 0 0 1 9.4 3.5a8.7 8.7 0 1 0 11.1 11.1Z" />
          </svg>
          <svg className="toolbar-icon theme-icon theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
          </svg>
        </button>
      </div>
    </header>
  );
}
