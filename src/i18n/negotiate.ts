import { isLocale, type Locale } from './routing.ts';

// The cookie the header's language menu sets, so a visitor who picked a
// language (signed out) gets it back on locale-less URLs.
export const LOCALE_COOKIE = 'locale';

// The first supported locale in an Accept-Language header, by q-value then
// order; region subtags are ignored ("zh-TW" → zh). Null when none match
// (crawlers usually send no header at all).
export function localeFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const ranges = header.split(',').map((part, index) => {
    const [tag, ...params] = part.trim().split(';');
    // A malformed q-value makes the range unusable rather than preferred.
    const q = params.map(param => param.trim()).find(param => /^q=/i.test(param));
    return { language: tag.trim().toLowerCase().split('-')[0], q: q === undefined ? 1 : /^q=(0(\.\d*)?|1(\.0*)?)$/i.test(q) ? Number(q.slice(2)) : NaN, index };
  }).filter(range => range.q > 0 && !Number.isNaN(range.q));
  ranges.sort((a, b) => b.q - a.q || a.index - b.index);
  return ranges.map(range => range.language).find(isLocale) ?? null;
}

export function localeFromCookie(header: string | null): Locale | null {
  const value = header?.split(';').map(part => part.trim().split('=')).find(([name]) => name === LOCALE_COOKIE)?.[1];
  return isLocale(value) ? value : null;
}
