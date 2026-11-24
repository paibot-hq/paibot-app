import type { ComponentProps } from 'react';
import type { IntlProvider } from 'use-intl';
import type { Locale } from './routing';

export type AppMessages = NonNullable<ComponentProps<typeof IntlProvider>['messages']>;

// Dynamic per-locale imports keep all 3 message bundles (~1.74 MB total) out of
// the shared client root chunk; each visitor only downloads their active locale.
const loaders: Record<Locale, () => Promise<{ default: unknown }>> = {
  ja: () => import('../../messages/ja.json'),
  en: () => import('../../messages/en.json'),
  zh: () => import('../../messages/zh.json'),
};

const cache = new Map<Locale, AppMessages>();

export async function loadMessages(locale: Locale): Promise<AppMessages> {
  const cached = cache.get(locale);
  if (cached) return cached;
  const loaded = (await loaders[locale]()).default as AppMessages;
  cache.set(locale, loaded);
  return loaded;
}

export function getCachedMessages(locale: Locale): AppMessages | undefined {
  return cache.get(locale);
}
