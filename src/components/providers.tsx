"use client";

import { createContext, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useFetcher } from "react-router";
import { ClerkProvider, useClerk } from "@clerk/react-router";
import { enUS, jaJP, zhCN } from "@clerk/localizations";
import { useLocale } from "use-intl";
import { usePathname } from "../i18n/navigation";
import { useProfileData } from "../routes/locale";

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

type SignOutOptions = { redirectUrl?: string };
type SignOut = (optionsOrCallback?: SignOutOptions | (() => void), options?: SignOutOptions) => Promise<unknown>;

const patchedInstances = new WeakSet<object>();

// clerk-js freezes afterSignOutUrl when it loads and ignores every later
// update, so that prop can only ever point at the page the visitor first
// landed on. UserButton's built-in "Sign out" then calls signOut() with a
// callback that navigates there, stranding people who signed in on one page
// and signed out on another. Passing redirectUrl explicitly does win, so
// default it to wherever the visitor is right now.
function KeepSignOutOnCurrentPage() {
  const language = useLocale();
  const pathname = usePathname();
  const clerk = useClerk();
  const target = useRef("");
  target.current = `/${language}${pathname === "/" ? "" : pathname}`;

  useEffect(() => {
    const instance = (window as unknown as { Clerk?: { signOut: SignOut } }).Clerk;
    if (!instance || patchedInstances.has(instance)) return;
    patchedInstances.add(instance);
    const signOut = instance.signOut.bind(instance);
    instance.signOut = (optionsOrCallback, options) => {
      const given = typeof optionsOrCallback === "function" ? options : optionsOrCallback;
      return signOut({ ...given, redirectUrl: given?.redirectUrl ?? target.current });
    };
  }, [clerk.loaded]);

  return null;
}

export default function Providers({ children, loaderData }: { children: ReactNode; loaderData: ComponentProps<typeof ClerkProvider>["loaderData"] }) {
  const language = useLocale();
  const profile = useProfileData();
  const saveTheme = useFetcher();
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

  // Signed in, the account decides and this browser's localStorage steps
  // aside: otherwise clearing the setting could never take effect, with the
  // old value still sitting in storage. No stored theme means follow the
  // device. Declared after the effect above so it wins on mount.
  useEffect(() => { if (profile.signedIn) setTheme(profile.theme ?? "auto"); }, [profile.signedIn, profile.theme]);

  useEffect(() => { document.documentElement.dataset.theme = resolvedTheme; }, [resolvedTheme]);

  function toggleTheme() {
    const value = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(value);
    savePreference("paibot-app-theme", value);
    // Optimistic: the toggle has already applied. A failed save just means the
    // next load falls back to what the account last stored.
    if (profile.signedIn) saveTheme.submit({ intent: "theme", value }, { method: "post", action: `/${language}/profile` });
  }

  return (
    <PreferencesContext.Provider value={{ resolvedTheme, toggleTheme }}>
      <ClerkProvider
        loaderData={loaderData}
        signInUrl={`/${language}/sign-in`}
        signUpUrl={`/${language}/sign-up`}
        signInFallbackRedirectUrl={`/${language}`}
        signUpFallbackRedirectUrl={`/${language}`}
        // Only the fallback for a visitor who signs out before clerk-js has
        // loaded; KeepSignOutOnCurrentPage handles every other sign-out.
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
        <KeepSignOutOnCurrentPage />
        {children}
      </ClerkProvider>
    </PreferencesContext.Provider>
  );
}
