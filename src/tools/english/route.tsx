import { useTranslations } from 'use-intl';
import ToolLayout from '../../components/tool-layout';
import { Link } from '../../i18n/navigation';
import type { DynamicT } from '../../lib/apps';
import { ENGLISH_CATALOG, ENGLISH_GRADES, ENGLISH_UNITS } from './catalog';
import { getPlayableEnglishSets } from './problems.server';
import styles from './english.module.css';
import type { Route } from './+types/route';

// /english: every learning item by level (5 to 1), grammar then vocabulary, each linking to its page. Items with
// published problems are highlighted. Not yet in the app catalog: noindex, so no PublicHead (see catalog.ts).
export async function loader() {
  return { playable: await getPlayableEnglishSets() };
}

export default function English({ loaderData: { playable } }: Route.ComponentProps) {
  const t = useTranslations('App.english') as unknown as DynamicT;
  return <>
    <title>{`${t('title')} | PAIBOT.app`}</title>
    <ToolLayout title={t('title')} centerTitle>
      <p className={styles.description}>{t('description')}</p>
      {ENGLISH_GRADES.map(grade => {
        const units = ENGLISH_UNITS.map(unit => ({ unit, items: ENGLISH_CATALOG[unit].filter(item => item.grade === grade) })).filter(({ items }) => items.length);
        return <section key={grade} className={styles.grade} aria-labelledby={`grade-${grade}`}>
          <h2 id={`grade-${grade}`} className={styles.gradeTitle}>{t(`grades.${grade}`)}</h2>
          {units.map(({ unit, items }) => <div key={unit}>
            <h3 className={styles.unitTitle}>{t(`units.${unit}.title`)}</h3>
            <ul className={styles.items}>
              {items.map(item => {
                const ready = item.sets.some(set => playable.includes(`${unit}/${item.id}/${set.id}`));
                return <li key={item.id}>
                  <Link href={`/english/${unit}/${item.id}`} className={styles.card} data-playable={ready || undefined}>
                    <span className={styles.cardTitle}>
                      {t(`units.${unit}.items.${item.id}`)}
                      {!ready && <span className={styles.badge}>{t('comingSoon')}</span>}
                    </span>
                  </Link>
                </li>;
              })}
            </ul>
          </div>)}
        </section>;
      })}
      <p className={styles.note}>{t('levelNote')}</p>
    </ToolLayout>
  </>;
}
