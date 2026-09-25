import { Outlet } from 'react-router';
import { isLocale } from '../i18n/routing';
import type { Route } from './+types/locale';
export function loader({ params }: Route.LoaderArgs) {
  if (!isLocale(params.locale)) throw new Response('Not Found', { status: 404 });
  return null;
}
export default function LocaleLayout() { return <Outlet />; }
