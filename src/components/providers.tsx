"use client";

import { createContext, useContext, useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { ClerkProvider } from "@clerk/react-router";
import { enUS, jaJP, zhCN } from "@clerk/localizations";
import { useLocale } from "use-intl";
import { usePathname } from "../i18n/navigation";

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

export default function Providers({ children, loaderData }: { children: ReactNode; loaderData: ComponentProps<typeof ClerkProvider>["loaderData"] }) {
  const language = useLocale();
  const pathname = usePathname();
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
        loaderData={loaderData}
        signInUrl={`/${language}/sign-in`}
        signUpUrl={`/${language}/sign-up`}
        signInFallbackRedirectUrl={`/${language}`}
        signUpFallbackRedirectUrl={`/${language}`}
        // Dynamic (not a fixed home fallback like the two above): sign-out
        // is a direct action on whatever page you're already on (no
        // intermediate navigation the way sign-in has), so the current
        // pathname at click time is exactly where it should return you.
        afterSignOutUrl={`/${language}${pathname === "/" ? "" : pathname}`}
        // ClerkProvider only re-syncs its full options (including
        // afterSignOutUrl above) into the already-loaded Clerk instance when
        // this `localization` object's reference changes - not on every
        // render - so a stable jaJP/zhCN/enUS reference would leave
        // afterSignOutUrl stuck at whatever page was active on first mount.
        // Spreading it forces a fresh reference each render.
        localization={{ ...(language === "ja" ? jaJP : language === "zh" ? zhCN : enUS) }}
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
