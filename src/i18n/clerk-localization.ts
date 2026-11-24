import type { ComponentProps } from 'react';
import type { ClerkProvider } from '@clerk/react-router';
import type { Locale } from './routing';

export type ClerkLocalization = ComponentProps<typeof ClerkProvider>['localization'];

const cache = new Map<Locale, ClerkLocalization>();

// Preload only the active locale's Clerk UI strings before hydration and SPA
// locale switches so ClerkProvider receives `localization` on its very first
// render (clerk-js ignores late localization updates after initialization).
export async function loadClerkLocalization(locale: Locale): Promise<ClerkLocalization> {
  if (locale !== 'ja' && locale !== 'zh') return undefined;
  const cached = cache.get(locale);
  if (cached) return cached;
  const loaded = locale === 'ja'
    ? (await import('@clerk/localizations/ja-JP')).jaJP
    : (await import('@clerk/localizations/zh-CN')).zhCN;
  cache.set(locale, loaded);
  return loaded;
}

export function getCachedClerkLocalization(locale: string): ClerkLocalization {
  return locale === 'ja' || locale === 'zh' ? cache.get(locale) : undefined;
}
