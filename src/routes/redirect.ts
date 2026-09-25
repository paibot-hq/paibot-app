import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { defaultLocale } from '../i18n/routing';

export function loader({ request }: LoaderFunctionArgs) {
  const { pathname, search } = new URL(request.url);
  return redirect(`/${defaultLocale}${pathname === '/' ? '' : pathname}${search}`, 307);
}
