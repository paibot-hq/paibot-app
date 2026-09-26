import { useEffect, useRef, useState } from 'react';
import { data, useFetcher } from 'react-router';
import { getAuth } from '@clerk/react-router/server';
import { getClockZone, saveClockZone } from '../lib/clock.server';
import type { Route } from './+types/clock';
import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import styles from './clock.module.css';

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
  const zone = (await args.request.formData()).get('timeZone');
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
  // The server cannot know the visitor's time zone. Start after hydration.
  const [now, setNow] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [timeZone, setTimeZone] = useState(settings.timeZone);
  const [zones, setZones] = useState<string[]>([settings.timeZone].filter(zone => zone !== 'auto' && zone !== 'UTC'));
  const fetcher = useFetcher<typeof action>();
  const [dirty, setDirty] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    setZones([...new Set([settings.timeZone, ...Intl.supportedValuesOf('timeZone')])].filter(zone => zone !== 'auto' && zone !== 'UTC').sort());
    const timer = setInterval(update, 250);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  useEffect(() => {
    const sync = () => setExpanded(document.fullscreenElement === panel.current);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false); };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('fullscreenchange', sync); document.removeEventListener('keydown', escape); };
  }, []);
  async function toggle() {
    if (expanded) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      setExpanded(false);
    } else {
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
        <fetcher.Form method="post" className={styles.settings} onSubmit={() => setDirty(false)}>
          <label htmlFor="clock-zone">{t('timeZone')}</label>
          <select id="clock-zone" name="timeZone" value={timeZone} disabled={fetcher.state !== 'idle'} onChange={event => { setTimeZone(event.target.value); setDirty(true); }}>
            <option value="auto">{t('automatic')}</option>
            <option value="UTC">UTC</option>
            {zones.map(zone => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}
          </select>
          {settings.userId ? <button type="submit" disabled={fetcher.state !== 'idle'}>{fetcher.state !== 'idle' ? t('saving') : t('save')}</button> : <span className={styles.zone}>{t('signInToSave')}</span>}
          {settings.failed && <span role="alert">{t('loadError')}</span>}
          {!dirty && fetcher.data?.error && <span role="alert">{t(fetcher.data.error)}</span>}
          {!dirty && fetcher.state === 'idle' && fetcher.data?.ok && <span role="status">{t('saved')}</span>}
        </fetcher.Form>
        <button type="button" onClick={toggle} aria-pressed={expanded}>{expanded ? t('exitFullscreen') : t('fullscreen')}</button>
      </div>
    </ToolLayout>
  </>;
}
