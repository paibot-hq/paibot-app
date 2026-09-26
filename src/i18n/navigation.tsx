import { Link as RouterLink, useLocation, type LinkProps } from 'react-router';
import { useLocale } from 'use-intl';
import { isLocale, type Locale } from './routing';
export function Link({ href, locale, ...props }: Omit<LinkProps, 'to'> & { href: string; locale?: Locale }) {
  const current = useLocale();
  const target = locale ?? current;
  const to = href.startsWith('/') ? `/${target}${href === '/' ? '' : href}` : href;
  return <RouterLink {...props} to={to} />;
}
export function usePathname() {
  const { pathname } = useLocation();
  const parts = pathname.split('/');
  return isLocale(parts[1]) ? '/' + parts.slice(2).join('/') : pathname;
}

// Only accept a redirect target that's a same-locale internal path - never
// pass an untrusted `redirect_url` query value straight to Clerk's
// forceRedirectUrl, or a link like "?redirect_url=https://evil.example"
// becomes an open redirect after a real sign-in.
export function safeRedirectTarget(value: string | null, locale: Locale): string | undefined {
  if (!value || !value.startsWith(`/${locale}`)) return undefined;
  if (value.length > `/${locale}`.length && value[`/${locale}`.length] !== '/') return undefined;
  return value;
}
