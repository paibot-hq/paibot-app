import { useEffect, useState } from 'react';
import { data, useFetcher } from 'react-router';
import { SignInButton } from '@clerk/react-router';
import { getAuth } from '@clerk/react-router/server';
import { useLocale, useTranslations } from 'use-intl';
import ToolLayout from '../components/tool-layout';
import { isLocale, locales } from '../i18n/routing';
import { localToday, parseCalendarDay } from '../lib/life-calendar';
import { getProfile, saveProfile, type Profile } from '../lib/profile.server';
import type { Route } from './+types/profile';
import styles from './profile.module.css';

const privateHeaders = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' };
export function headers() { return privateHeaders; }

// Same bounds buildLifeCalendar enforces, so a stored date can never produce
// a calendar the tool would reject. "Today" is UTC here; for a birth date the
// hours of difference against any local date never matter.
function isBirthDate(value: string) {
  return parseCalendarDay(value) !== null && value >= '1900-01-01' && value <= new Date().toISOString().slice(0, 10);
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) return data({ signedIn: false, profile: null, failed: false }, { headers: privateHeaders });
  try { return data({ signedIn: true, profile: await getProfile(userId), failed: false }, { headers: privateHeaders }); }
  // Do not log: the row holds a birth date.
  catch { return data({ signedIn: true, profile: null, failed: true }, { status: 503, headers: privateHeaders }); }
}

export async function action(args: Route.ActionArgs) {
  const fail = (error: 'signedOut' | 'invalid' | 'unavailable', status: number) =>
    data({ ok: false as const, error }, { status, headers: privateHeaders });
  if (args.request.method !== 'POST') return fail('invalid', 405);
  const { userId } = await getAuth(args);
  if (!userId) return fail('signedOut', 401);
  if (args.request.headers.get('Origin') !== new URL(args.request.url).origin) return fail('invalid', 403);
  let form: FormData;
  try { form = await args.request.formData(); } catch { return fail('invalid', 400); }
  const intent = String(form.get('intent'));
  const raw = form.get('value');
  const value = typeof raw === 'string' ? raw : '';
  const update: Partial<Profile> | null =
    intent === 'clearBirthDate' ? { birthDate: null }
    : intent === 'birthDate' ? (isBirthDate(value) ? { birthDate: value } : null)
    // An empty value clears the setting: these must be reversible.
    : intent === 'locale' ? (value === '' ? { locale: null } : isLocale(value) ? { locale: value } : null)
    : intent === 'theme' ? (value === '' ? { theme: null } : value === 'light' || value === 'dark' ? { theme: value } : null)
    : null;
  if (!update) return fail('invalid', 400);
  try {
    await saveProfile(userId, update);
    return data({ ok: true as const, error: null }, { headers: privateHeaders });
  } catch { return fail('unavailable', 503); }
}

export default function Profile({ loaderData }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.profile');
  const { signedIn, profile, failed } = loaderData;
  const fetcher = useFetcher<typeof action>();
  const busy = fetcher.state !== 'idle';
  const pending = fetcher.formData?.get('intent');
  // The date shown as registered: what was submitted while it is in flight, so that it never snaps back to the stored one mid-save.
  const stored = profile?.birthDate ?? '';
  const birthDate = pending === 'clearBirthDate' ? ''
    : pending === 'birthDate' ? String(fetcher.formData?.get('value'))
    : stored;
  // What is in the box is a draft, saved only by the button. A date field fires a change for every digit typed (the year 1990 is "0001" first), so
  // saving on change rejected the first of them and then took the box away while the rest was being typed.
  const [draft, setDraft] = useState(stored);
  useEffect(() => { setDraft(stored); }, [stored]);
  const shown = birthDate ? new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${birthDate}T00:00:00Z`)) : '';
  const language = pending === 'locale' ? String(fetcher.formData?.get('value')) : profile?.locale ?? '';
  const theme = pending === 'theme' ? String(fetcher.formData?.get('value')) : profile?.theme ?? '';
  const save = (intent: string, value: string) => fetcher.submit({ intent, value }, { method: 'post', action: `/${locale}/profile` });

  return <><title>{`${t('title')} | PAIBOT.app`}</title><ToolLayout title={t('title')}>
    <div className={styles.profile}>
      <p className={styles.muted}>{t('intro')}</p>
      {!signedIn ? <div className={styles.empty}>
        <p>{t('signInPrompt')}</p>
        <SignInButton mode="modal" forceRedirectUrl={`/${locale}/profile`} signUpForceRedirectUrl={`/${locale}/profile`}>
          <button className={styles.primary}>{t('signIn')}</button>
        </SignInButton>
      </div> : failed ? <p role="alert">{t('unavailable')}</p> : <>
        <section className={styles.field}>
          <label htmlFor="profile-birth-date">{t('birthDate')}</label>
          <form className={styles.row} onSubmit={event => { event.preventDefault(); if (draft) save('birthDate', draft); }}>
            <input id="profile-birth-date" type="date" min="1900-01-01" max={localToday()} value={draft} required
              onChange={event => setDraft(event.target.value)} />
            <button type="submit" className={styles.primary} disabled={busy || !draft || draft === stored}>{t('save')}</button>
            {stored && <button type="button" disabled={busy}
              onClick={() => confirm(t('confirmClear')) && save('clearBirthDate', '')}>{t('clear')}</button>}
          </form>
          <p className={styles.registered} data-profile="registered">{birthDate ? t('registered', { date: shown }) : t('notRegistered')}</p>
          <p className={styles.muted}>{t('birthDateNote')}</p>
        </section>

        <section className={styles.field}>
          <label htmlFor="profile-locale">{t('language')}</label>
          <select id="profile-locale" value={language} disabled={busy} onChange={event => save('locale', event.target.value)}>
            <option value="">{t('unset')}</option>
            {locales.map(value => <option key={value} value={value}>{t(`languages.${value}` as 'languages.ja')}</option>)}
          </select>
          <p className={styles.muted}>{t('languageNote')}</p>
        </section>

        <section className={styles.field}>
          <label htmlFor="profile-theme">{t('theme')}</label>
          <select id="profile-theme" value={theme} disabled={busy} onChange={event => save('theme', event.target.value)}>
            <option value="">{t('themeAuto')}</option>
            <option value="light">{t('themeLight')}</option>
            <option value="dark">{t('themeDark')}</option>
          </select>
        </section>

        <p aria-live="polite" className={styles.status}>
          {busy ? t('saving') : fetcher.data?.error ? <span role="alert">{t(fetcher.data.error)}</span> : fetcher.data?.ok ? t('saved') : ' '}
        </p>
      </>}
    </div>
  </ToolLayout></>;
}
