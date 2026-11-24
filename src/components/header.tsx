"use client";

import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { Link } from "../i18n/navigation";
import { Show, UserButton } from "@clerk/react-router";
import { useProfileData } from "../routes/locale";
import { type Locale } from "../i18n/routing";
import { LOCALE_COOKIE } from "../i18n/negotiate";
import { useTranslations, useLocale } from "use-intl";
import { usePathname } from "../i18n/navigation";
import { HOME_SECTIONS } from "../lib/home-sections";
import { usePreferences } from "./providers";

const languageNames: Record<Locale, string> = { ja: "日本語", en: "English", zh: "简体中文" };

export default function Header() {
  const language = useLocale() as Locale;
  const pathname = usePathname();
  const t = useTranslations("App");
  const { resolvedTheme, toggleTheme } = usePreferences();
  const { signedIn } = useProfileData();
  const saveLanguage = useFetcher();
  // The switch itself is the setting, so remember it: a cookie for the
  // locale-less redirect (routes/redirect.ts), and the profile when signed
  // in. The page navigates immediately either way; this just rides along.
  const chooseLanguage = (value: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    if (signedIn && value !== language) saveLanguage.submit({ intent: "locale", value }, { method: "post", action: `/${language}/profile` });
  };
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
    <header className="topbar" data-switcher>
      <Link className="brand" href="/">
        <img className="brand-logo" src="/icon.svg" alt="" width="24" height="24" />
        <span className="wordmark">PAIBOT.app</span>
      </Link>
      <nav className="site-switcher" aria-label={t("search.shelfFilter")}>
        {HOME_SECTIONS.map(section => <Link key={section} href={`/${section}`} aria-current={pathname === `/${section}` ? "page" : undefined}>
          {t(`search.shelves.${section}`)}
        </Link>)}
      </nav>
      <div className="toolbar">
        <Show when="signed-out">
          <Link className="auth-link" href={`/sign-in?redirect_url=${encodeURIComponent(`/${language}${pathname === "/" ? "" : pathname}`)}`}>{t("signIn")}</Link>
          <Link className="auth-link" href={`/sign-up?redirect_url=${encodeURIComponent(`/${language}${pathname === "/" ? "" : pathname}`)}`}>{t("signUp")}</Link>
        </Show>
        <Show when="signed-in">
          <UserButton>
            <UserButton.MenuItems>
              {/* Clerk renders this link itself, so it cannot use the
                  locale-aware Link - spell the locale out. */}
              <UserButton.Link href={`/${language}/profile`} label={t("profile.menu")} labelIcon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
                </svg>} />
            </UserButton.MenuItems>
          </UserButton>
        </Show>
        <div className="language-menu" ref={menuRef}>
          <button ref={languageButtonRef} className="language-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={t("languageSelect")} aria-expanded={menuOpen} aria-controls="language-options">
            <svg className="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21M12 3c-2.4 2.5-3.6 5.5-3.6 9s1.2 6.5 3.6 9" />
            </svg>
          </button>
          <div className="language-options" id="language-options" role="menu" hidden={!menuOpen}>
            {(["ja", "en", "zh"] as const).map(value =>
              <Link key={value} href={pathname} locale={value} role="menuitem" aria-current={language === value ? "page" : undefined}
                onClick={() => { setMenuOpen(false); chooseLanguage(value); }}>{languageNames[value]}</Link>)}
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
