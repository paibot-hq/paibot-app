import { useEffect, useState } from 'react';
import { data, Link, useFetcher } from 'react-router';
import { SignInButton } from '@clerk/react-router';
import { getAuth } from '@clerk/react-router/server';
import { useLocale, useTranslations } from 'use-intl';
import ToolLayout from '../components/tool-layout';
import { createEntry, deleteEntry, editEntry, hasTodayEntry, listEntries, PAGE_SIZE } from '../lib/diary.server';
import type { Route } from './+types/diary';
import styles from './diary.module.css';

const privateHeaders = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' };
export function headers() { return privateHeaders; }
export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  const pageValue = Number(new URL(args.request.url).searchParams.get('page') ?? 0);
  const page = Number.isInteger(pageValue) && pageValue >= 0 && pageValue <= 10000 ? pageValue : 0;
  if (!userId) return data({ signedIn: false, entries: [], hasMore: false, page, failed: false, postedToday: false }, { headers: privateHeaders });
  try {
    const [rows, postedToday] = await Promise.all([listEntries(userId, page), hasTodayEntry(userId)]);
    return data({ signedIn: true, entries: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE, page, failed: false, postedToday }, { headers: privateHeaders });
  } catch {
    // Do not log SQL parameters: they may contain private diary content.
    return data({ signedIn: true, entries: [], hasMore: false, page, failed: true, postedToday: false }, { status: 503, headers: privateHeaders });
  }
}
export async function action(args: Route.ActionArgs) {
  const fail = (error: 'signedOut' | 'invalid' | 'missing' | 'unavailable' | 'alreadyPosted', status: number) =>
    data({ ok: false as const, error }, { status, headers: privateHeaders });
  if (args.request.method !== 'POST') return fail('invalid', 405);
  const { userId } = await getAuth(args);
  if (!userId) return fail('signedOut', 401);
  if (args.request.headers.get('Origin') !== new URL(args.request.url).origin) return fail('invalid', 403);
  const form = await args.request.formData();
  const intent = form.get('intent');
  const id = form.get('id');
  const rawBody = form.get('body');
  const body = typeof rawBody === 'string' ? rawBody.trim() : '';
  if (!['create', 'edit', 'delete'].includes(String(intent))) return fail('invalid', 400);
  if (intent !== 'delete' && (!body || Array.from(body).length > 280)) return fail('invalid', 400);
  if (intent !== 'create' && (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id))) return fail('missing', 404);
  try {
    if (intent === 'create') {
      if (!(await createEntry(userId, body)).length) return fail('alreadyPosted', 409);
    }
    else {
      const rows = intent === 'edit' ? await editEntry(userId, id as string, body) : await deleteEntry(userId, id as string);
      if (!rows.length) return fail('missing', 404);
    }
    return data({ ok: true as const, error: null }, { headers: privateHeaders });
  } catch { return fail('unavailable', 503); }
}

type Entry = { id: string; body: string; createdAt: string; updatedAt: string };
function EntryForm({ entry, onDone }: { entry?: Entry; onDone?: () => void }) {
  const t = useTranslations('App.diary');
  const locale = useLocale();
  const fetcher = useFetcher<typeof action>();
  const [body, setBody] = useState(entry?.body ?? '');
  const length = Array.from(body).length;
  const busy = fetcher.state !== 'idle';
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) {
      setBody(''); onDone?.();
    }
  }, [fetcher.state, fetcher.data, onDone]);
  return <fetcher.Form method="post" action={`/${locale}/diary`} className={styles.composer}>
    <input type="hidden" name="intent" value={entry ? 'edit' : 'create'} />
    {entry && <input type="hidden" name="id" value={entry.id} />}
    <label htmlFor={`body-${entry?.id ?? 'new'}`}>{entry ? t('edit') : t('prompt')}</label>
    <textarea id={`body-${entry?.id ?? 'new'}`} name="body" value={body} onChange={event => setBody(event.target.value)}
      placeholder={t('placeholder')} rows={3} required disabled={busy} aria-describedby={`count-${entry?.id ?? 'new'}`} />
    <div className={styles.actions}>
      <span id={`count-${entry?.id ?? 'new'}`} className={length > 280 ? styles.error : styles.muted}>{length} / 280</span>
      {entry && <button type="button" onClick={onDone} disabled={busy}>{t('cancel')}</button>}
      <button type="submit" className={styles.primary} disabled={busy || !body.trim() || length > 280}>{busy ? t('saving') : entry ? t('save') : t('post')}</button>
    </div>
    {fetcher.data?.error && <p role="alert" className={styles.error}>{t(fetcher.data.error)}</p>}
    {!entry && fetcher.data?.ok && <span role="status" className={styles.muted}>{t('posted')}</span>}
  </fetcher.Form>;
}
function DiaryEntry({ entry }: { entry: Entry }) {
  const t = useTranslations('App.diary');
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const fetcher = useFetcher<typeof action>();
  return <article className={styles.entry} data-entry-id={entry.id}>
    <div className={styles.meta}><time dateTime={entry.createdAt}>{new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tokyo',
    }).format(new Date(entry.createdAt))} JST</time>{entry.updatedAt !== entry.createdAt && <span>{t('edited')}</span>}</div>
    {editing ? <EntryForm entry={entry} onDone={() => setEditing(false)} /> : <>
      <p className={styles.body}>{entry.body}</p>
      <div className={styles.actions}>
        {!confirming ? <><button onClick={() => setEditing(true)}>{t('edit')}</button><button onClick={() => setConfirming(true)}>{t('delete')}</button></> :
          <fetcher.Form method="post" action={`/${locale}/diary`} className={styles.actions}>
            <input type="hidden" name="id" value={entry.id} /><input type="hidden" name="intent" value="delete" />
            <span>{t('confirmDelete')}</span>
            <button type="button" onClick={() => setConfirming(false)} disabled={fetcher.state !== 'idle'}>{t('cancel')}</button>
            <button type="submit" disabled={fetcher.state !== 'idle'}>{t('delete')}</button>
          </fetcher.Form>}
      </div>
      {fetcher.data?.error && <p role="alert" className={styles.error}>{t(fetcher.data.error)}</p>}
    </>}
  </article>;
}
export default function Diary({ loaderData }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.diary');
  const { signedIn, entries, hasMore, page, failed, postedToday } = loaderData;
  return <><title>{`${t('title')} | PAIBOT.app`}</title><ToolLayout title={t('title')}>
    <div className={styles.diary}>
      <p className={styles.muted}>{t('private')}</p>
      {!signedIn ? <div className={styles.empty}><p>{t('signInPrompt')}</p><SignInButton mode="modal" forceRedirectUrl={`/${locale}/diary`} signUpForceRedirectUrl={`/${locale}/diary`}><button className={styles.primary}>{t('signIn')}</button></SignInButton></div> :
        failed ? <p role="alert">{t('unavailable')}</p> : <>
          {page === 0 && (postedToday ? <p role="status">{t('alreadyPosted')}</p> : <EntryForm />)}
          {entries.length === 0 && <p className={styles.empty}>{page === 0 ? t('empty') : t('noMore')}</p>}
          <div>{entries.map(entry => <DiaryEntry key={entry.id} entry={entry} />)}</div>
          <nav className={styles.pagination} aria-label={t('pages')}>
            {page > 0 ? <Link preventScrollReset to={page === 1 ? '?' : `?page=${page - 1}`}>← {t('newer')}</Link> : <button disabled>← {t('newer')}</button>}
            {hasMore ? <Link preventScrollReset to={`?page=${page + 1}`}>{t('older')} →</Link> : <button disabled>{t('older')} →</button>}
          </nav>
        </>}
    </div>
  </ToolLayout></>;
}
