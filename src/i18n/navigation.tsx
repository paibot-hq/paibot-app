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
