import { data } from 'react-router';
import { getAuth } from '@clerk/react-router/server';
import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../../components/public-head';
import { getProfile } from '../../lib/profile.server';
import BirthdayFortune from './birthday-fortune';
import type { Route } from './+types/route';

// The birth date registered in the profile is read here and is the first one the page uses. It is personal, so this response must never be shared (the
// page itself stays public and indexable), as for the life calendar. The shared locale loader leaves the birth date out on purpose.
const privateHeaders = { 'Cache-Control': 'private, no-store' };
export function headers() { return privateHeaders; }
export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) return data({ userId, birthDate: null }, { headers: privateHeaders });
  try { return data({ userId, birthDate: (await getProfile(userId)).birthDate }, { headers: privateHeaders }); }
  catch { return data({ userId, birthDate: null }, { headers: privateHeaders }); }
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const t = useTranslations('App');
  const locale = useLocale();
  // Rebuilt on sign-in or sign-out, so that the registered date is picked up.
  return <><PublicHead locale={locale} path="/birthday-fortune" title={`${t('birthdayFortune.title')} | PAIBOT.app`} description={t('birthdayFortune.description')} /><BirthdayFortune key={loaderData.userId ?? 'guest'} signedIn={Boolean(loaderData.userId)} profileBirth={loaderData.birthDate} /></>;
}
