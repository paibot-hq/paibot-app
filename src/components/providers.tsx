"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { enUS, jaJP, zhCN } from "@clerk/localizations";
import { useLocale } from "next-intl";

type Theme = "auto" | "light" | "dark";
type Preferences = {
  resolvedTheme: "light" | "dark";
  toggleTheme: () => void;
};
const PreferencesContext = createContext<Preferences | null>(null);

function savePreference(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* Preferences are optional. */ }
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("Preferences provider is missing");
  return context;
}

export default function Providers({ children }: { children: ReactNode }) {
  const language = useLocale();
  const [theme, setTheme] = useState<Theme>("auto");
  const [prefersLight, setPrefersLight] = useState(false);
  const resolvedTheme = theme === "auto" ? (prefersLight ? "light" : "dark") : theme;

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem("paibot-app-theme");
      if (storedTheme === "auto" || storedTheme === "light" || storedTheme === "dark") setTheme(storedTheme);
    } catch { /* Use defaults when storage is unavailable. */ }
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const update = () => setPrefersLight(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => { document.documentElement.dataset.theme = resolvedTheme; }, [resolvedTheme]);

  function toggleTheme() {
    const value = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(value);
    savePreference("paibot-app-theme", value);
  }

  return (
    <PreferencesContext.Provider value={{ resolvedTheme, toggleTheme }}>
      <ClerkProvider
        signInUrl={`/${language}/sign-in`}
        signUpUrl={`/${language}/sign-up`}
        signInFallbackRedirectUrl={`/${language}`}
        signUpFallbackRedirectUrl={`/${language}`}
        afterSignOutUrl={`/${language}`}
        localization={language === "ja" ? jaJP : language === "zh" ? zhCN : enUS}
        appearance={{ variables: {
          colorPrimary: resolvedTheme === "dark" ? "#7fb4dc" : "#2f638f",
          colorBackground: resolvedTheme === "dark" ? "#151f2b" : "#ffffff",
          colorForeground: resolvedTheme === "dark" ? "#eef4fb" : "#162333",
          colorInput: resolvedTheme === "dark" ? "#0f1720" : "#f4f7fa",
          colorInputForeground: resolvedTheme === "dark" ? "#eef4fb" : "#162333",
        } }}
      >
        {children}
      </ClerkProvider>
    </PreferencesContext.Provider>
  );
}
