import { useEffect, useRef, useState } from 'react';
import { data, useFetcher } from 'react-router';
import { getAuth } from '@clerk/react-router/server';
import { getClockZone, saveClockZone } from './clock.server';
import type { Route } from './+types/route';
import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../../components/public-head';
import ToolLayout from '../../components/tool-layout';
import type { DynamicT } from '../../lib/apps';
import styles from './clock.module.css';

// A curated, region-grouped shortlist beats the ~400-entry
// Intl.supportedValuesOf('timeZone') list for a casual daily-use tool -
// nobody can find "Asia/Tokyo" scrolling through hundreds of IANA zones.
const ZONE_GROUPS: readonly (readonly [string, readonly string[]])[] = [
  ['regionAsia', ['Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei', 'Asia/Singapore', 'Asia/Bangkok', 'Asia/Kolkata', 'Asia/Dubai']],
  ['regionEurope', ['Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow']],
  ['regionAmericas', ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Sao_Paulo']],
  ['regionOceania', ['Australia/Sydney', 'Pacific/Auckland']],
];
// Only ever called for a zone in ZONE_GROUPS, which always has a
// cities.<City> translation - see the untranslated fallback path below for
// a saved zone outside the curated list.
function cityLabel(zone: string, td: DynamicT) {
  return td(`cities.${zone.split('/').pop() ?? zone}`);
}
function rawZoneLabel(zone: string) {
  return (zone.split('/').pop() ?? zone).replaceAll('_', ' ');
}
const privateHeaders = { 'Cache-Control': 'private, no-store' };
export function headers() { return privateHeaders; }
export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) return data({ userId, timeZone: 'auto', failed: false }, { headers: privateHeaders });
  try { return data({ userId, timeZone: await getClockZone(userId), failed: false }, { headers: privateHeaders }); }
  catch { return data({ userId, timeZone: 'auto', failed: true }, { headers: privateHeaders }); }
}
export async function action(args: Route.ActionArgs) {
  const fail = (error: 'signInToSave' | 'saveError' | 'invalidZone', status: number) => data({ ok: false, error }, { status, headers: privateHeaders });
  if (args.request.method !== 'POST') return fail('saveError', 405);
  const { userId } = await getAuth(args);
  if (!userId) return fail('signInToSave', 401);
  if (args.request.headers.get('Origin') !== new URL(args.request.url).origin) return fail('saveError', 403);
  let form: FormData;
  try { form = await args.request.formData(); } catch { return fail('invalidZone', 400); }
  const zone = form.get('timeZone');
  if (typeof zone !== 'string' || zone.length > 100) return fail('invalidZone', 400);
  if (zone !== 'auto') {
    if (zone !== 'UTC' && !/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)+$/.test(zone)) return fail('invalidZone', 400);
    try { new Intl.DateTimeFormat('en', { timeZone: zone }).format(); }
    catch { return fail('invalidZone', 400); }
  }
  try {
    await saveClockZone(userId, zone);
    return data({ ok: true, error: null }, { headers: privateHeaders });
  } catch { return fail('saveError', 503); }
}
export default function Clock({ loaderData }: Route.ComponentProps) {
  return <ClockFace key={loaderData.userId ?? 'guest'} settings={loaderData} />;
}
function ClockFace({ settings }: { settings: Route.ComponentProps['loaderData'] }) {
  const locale = useLocale();
  const t = useTranslations('App.clock');
  // Region group keys (ZONE_GROUPS) are only known at runtime, like
  // src/lib/apps.tsx's tag and app keys - cast once here, same reasoning.
  const td = t as unknown as DynamicT;
  // The server cannot know the visitor's time zone. Start after hydration.
  const [now, setNow] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [timeZone, setTimeZone] = useState(settings.timeZone);
  const fetcher = useFetcher<typeof action>();
  const panel = useRef<HTMLDivElement>(null);
  // Whether the visitor last asked for fullscreen or to leave it: the browser takes a moment to enter it.
  const wanted = useRef(false);
  // A previously saved zone outside the curated list (an old save, or a
  // future list change) must still appear as a selectable, selected option -
  // otherwise the <select> silently falls back to its first option while
  // `timeZone` state still holds the real value.
  const isCurated = settings.timeZone === 'auto' || settings.timeZone === 'UTC'
    || ZONE_GROUPS.some(([, zones]) => zones.includes(settings.timeZone));
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = setInterval(update, 250);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  useEffect(() => {
    const sync = () => {
      const full = document.fullscreenElement === panel.current;
      // Fullscreen starts a moment after it is asked for. If the visitor has asked to leave again in the meantime, the late start is ended at once, so
      // that it does not bring the page back to fullscreen after "exit".
      if (full && !wanted.current) { void document.exitFullscreen().catch(() => {}); return; }
      if (!full) wanted.current = false; // left by the browser (Escape)
      setExpanded(full);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { wanted.current = false; setExpanded(false); } };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('fullscreenchange', sync); document.removeEventListener('keydown', escape); };
  }, []);
  async function toggle() {
    if (expanded) {
      wanted.current = false;
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      setExpanded(false);
    } else {
      wanted.current = true;
      setExpanded(true);
      // CSS expansion remains available when native fullscreen is unsupported.
      if (panel.current?.requestFullscreen) await panel.current.requestFullscreen().catch(() => {});
    }
  }
  return <><PublicHead locale={locale} path="/clock" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')}>
      <div ref={panel} className={styles.panel} data-expanded={expanded || undefined}>
        <div className={styles.face}>
          <p className={styles.date} data-clock-date>{now ? new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: timeZone === 'auto' ? undefined : timeZone }).format(now) : t('loading')}</p>
          <time className={styles.time} dateTime={now?.toISOString()} data-clock-time>{now ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: timeZone === 'auto' ? undefined : timeZone }).format(now) : '--:--:--'}</time>
          <p className={styles.zone}>{now ? (timeZone === 'auto' ? Intl.DateTimeFormat().resolvedOptions().timeZone : timeZone) : '\u00a0'}</p>
        </div>
        <div className={styles.settings}>
          <label htmlFor="clock-zone">{t('timeZone')}</label>
          <select id="clock-zone" name="timeZone" value={timeZone} disabled={fetcher.state !== 'idle'} onChange={event => {
            const zone = event.target.value;
            setTimeZone(zone);
            if (settings.userId) fetcher.submit({ timeZone: zone }, { method: 'post' });
          }}>
            <option value="auto">{t('automatic')}</option>
            <option value="UTC">UTC</option>
            {!isCurated && <option value={settings.timeZone}>{rawZoneLabel(settings.timeZone)}</option>}
            {ZONE_GROUPS.map(([region, zones]) => (
              <optgroup key={region} label={td(region)}>
                {zones.map(zone => <option key={zone} value={zone}>{cityLabel(zone, td)}</option>)}
              </optgroup>
            ))}
          </select>
          {!settings.userId && <span className={styles.zone}>{t('signInToSave')}</span>}
          {settings.failed && <span role="alert">{t('loadError')}</span>}
          {settings.userId && fetcher.state !== 'idle' && <span className={styles.zone}>{t('saving')}</span>}
          {settings.userId && fetcher.state === 'idle' && fetcher.data?.error && <span role="alert">{t(fetcher.data.error)}</span>}
          {settings.userId && fetcher.state === 'idle' && fetcher.data?.ok && <span role="status">{t('saved')}</span>}
        </div>
        <button type="button" onClick={toggle} aria-pressed={expanded}>{expanded ? t('exitFullscreen') : t('fullscreen')}</button>
      </div>
    </ToolLayout>
  </>;
}
