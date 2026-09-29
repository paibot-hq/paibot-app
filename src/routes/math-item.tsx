import { redirect } from 'react-router';
import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { getSetRecords } from '../lib/math-attempts.server';
import { findUnit } from '../lib/math-catalog';
import { getPlayableSets } from '../lib/math-problems.server';
import { catalogEntry } from '../lib/math-routes.server';
import styles from './math-item.module.css';
import type { Route } from './+types/math-item';

// Set pages used to live at /math/<unit>/<set id>; the id was usually
// "<item>-<letter>", except for these published before items had their own names.
const LEGACY_SETS: Record<string, string> = { 'arith/order-a': 'order-of-operations/a', 'arith/order-b': 'order-of-operations/b', 'arith/word-a': 'word-problems/a', 'arith/word-b': 'word-problems/b', 'factorization/squares-a': 'difference-of-squares/a', 'signed/four-ops-a': 'four-operations/a' };

// A learning item: what it covers and its practice sets (A, B, ...), with a
// signed-in user's latest and best score on each.
export async function loader(args: Route.LoaderArgs) {
  const { params } = args;
  const legacy = LEGACY_SETS[`${params.unit}/${params.item}`]?.split('/') ?? /^(.+)-([a-z])$/.exec(params.item)?.slice(1);
  const unit = findUnit(params.unit);
  if (legacy && unit?.items.some(item => item.id === legacy[0] && item.sets.some(set => set.id === legacy[1]))) {
    throw redirect(`/${params.locale}/math/${params.unit}/${legacy[0]}/${legacy[1]}`, 301);
  }
  const entry = catalogEntry(params);
  const [playable, records] = await Promise.all([getPlayableSets(), getSetRecords(args, entry.unit.id, entry.item.id)]);
  return {
    unitId: entry.unit.id, itemId: entry.item.id, published: entry.unit.status === 'published',
    sets: entry.item.sets.map(set => ({ id: set.id, playable: playable.includes(`${entry.unit.id}/${entry.item.id}/${set.id}`), record: records[set.id] })),
  };
}

export default function MathItem({ loaderData: { unitId, itemId, published, sets } }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.math') as unknown as DynamicT;
  const tq = useTranslations('App.math.quiz');
  const has = (key: string) => (t as unknown as { has: (key: string) => boolean }).has(key);
  const unitTitle = t(`units.${unitId}.title`);
  const itemKey = `units.${unitId}.items.${itemId}`;
  const title = t(`${itemKey}.title`);
  const description = has(`${itemKey}.description`) ? t(`${itemKey}.description`) : t(`units.${unitId}.summary`);
  const head = `${unitTitle} - ${title} | PAIBOT.app`;
  return <>
    {published ? <PublicHead locale={locale} path={`/math/${unitId}/${itemId}`} title={head} description={description} /> : <title>{head}</title>}
    <ToolLayout title={title} centerTitle aboveTitle={<p className={styles.back}><Link href="/math">{`← ${tq('backToMath')}`}</Link></p>}>
      <p className={styles.unit}>{unitTitle}</p>
      <p className={styles.description}>{description}</p>
      <p className={styles.choose}>{tq('chooseSet')}</p>
      <ul className={styles.sets}>
        {sets.map(({ id, playable, record }) => (
          <li key={id}>
            <Link href={`/math/${unitId}/${itemId}/${id}`} className={styles.card} data-playable={playable || undefined}>
              <span className={styles.cardTitle}>
                {tq('practice', { letter: id.toUpperCase() })}
                {!playable && <span className={styles.badge}>{t('comingSoon')}</span>}
              </span>
              {has(`${itemKey}.sets.${id}`) && <span className={styles.note}>{t(`${itemKey}.sets.${id}`)}</span>}
              {record && <span className={styles.record}>{tq('record', { last: record.last, best: record.best, total: record.total })}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </ToolLayout>
  </>;
}
