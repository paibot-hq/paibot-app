export const locales = ['ja', 'en', 'zh'] as const;
export const defaultLocale: Locale = 'ja';
export type Locale = typeof locales[number];
export function isLocale(value: string | undefined): value is Locale {
  return locales.some(locale => locale === value);
}
