import { useTranslations } from 'use-intl';
import ToolLayout from '../../components/tool-layout';
import { Link } from '../../i18n/navigation';
import type { DynamicT } from '../../lib/apps';
import { ENGLISH_CATALOG, ENGLISH_GRADES, ENGLISH_UNITS, gradeOfLevel, levelLabel, levelsOfGrade, type EnglishGrade } from './catalog';
import EnglishHomeHeader from './home-header';
import { getPlayableEnglishSets } from './problems.server';
import styles from './english.module.css';
import type { Route } from './+types/route';

// /english, the practice tab (the tests are /english/test): every learning item by unit, grammar then vocabulary, easiest first,
// each linking to its page and labelled with its Eiken grade and CEFR-J level. ?grade=e3 shows one grade's items only (links, so it works before the
// page's script has loaded). Items with published problems are highlighted. Not yet in the app catalog: noindex, so no
// PublicHead (see catalog.ts).
export async function loader({ request }: Route.LoaderArgs) {
  const grade = new URL(request.url).searchParams.get('grade');
  return {
    grade: ENGLISH_GRADES.includes(grade as EnglishGrade) ? grade as EnglishGrade : null,
    playable: await getPlayableEnglishSets(),
  };
}

export default function English({ loaderData: { grade, playable } }: Route.ComponentProps) {
  const t = useTranslations('App.english') as unknown as DynamicT;
  const filters: { key: EnglishGrade | null; label: string; href: string }[] = [
    { key: null, label: t('allGrades'), href: '/english' },
    ...ENGLISH_GRADES.map(key => ({ key, label: t(`grades.${key}`), href: `/english?grade=${key}` })),
  ];
  return <>
    <title>{`${t('title')} | PAIBOT.app`}</title>
    <ToolLayout title={t('title')} centerTitle compact>
      <EnglishHomeHeader mode="practice" />
      <p className={styles.description}>{t('description')}</p>
      <nav className={styles.filter} aria-label={t('gradeFilter')}>
        <ul className={styles.chips}>
          {filters.map(filter => <li key={filter.key ?? 'all'}>
            <Link href={filter.href} className={styles.chip} aria-current={filter.key === grade ? 'page' : undefined}>{filter.label}</Link>
          </li>)}
        </ul>
      </nav>
      {ENGLISH_UNITS.map(unit => {
        const items = ENGLISH_CATALOG[unit].filter(item => !grade || levelsOfGrade(grade).includes(item.level));
        return items.length > 0 && <section key={unit} className={styles.unit} aria-labelledby={`unit-${unit}`}>
          <h2 id={`unit-${unit}`} className={styles.unitTitle}>{t(`units.${unit}.title`)}</h2>
          <ul className={styles.items}>
            {items.map(item => {
              const ready = item.sets.some(set => playable.includes(`${unit}/${item.id}/${set.id}`));
              return <li key={item.id}>
                <Link href={`/english/${unit}/${item.id}`} className={styles.card} data-playable={ready || undefined}>
                  <span className={styles.cardTitle}>
                    {t(`units.${unit}.items.${item.id}`)}
                    {!ready && <span className={styles.badge}>{t('comingSoon')}</span>}
                  </span>
                  <span className={styles.level}>{t('levelLine', { grade: t(`grades.${gradeOfLevel(item.level)}`), level: levelLabel(item.level) })}</span>
                </Link>
              </li>;
            })}
          </ul>
        </section>;
      })}
      <p className={styles.note}>{t('levelNote')}</p>
    </ToolLayout>
  </>;
}
