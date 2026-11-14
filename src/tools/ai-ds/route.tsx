import { useTranslations } from 'use-intl';
import ToolLayout from '../../components/tool-layout';
import { Link } from '../../i18n/navigation';
import type { DynamicT } from '../../lib/apps';
import { AI_DS_CATALOG, AI_DS_EXAMS, type AiDsExam } from './catalog';
import { getPlayableAiDsSets } from './problems';
import ExamTags from './exam-tags';
import styles from './ai-ds.module.css';
import type { Route } from './+types/route';

// /ai-ds: every learning item by unit, each linking to its page and tagged with the exams it belongs to. ?exam=g shows one exam's
// items only (links, so it works before the page's script has loaded). Items with published problems are highlighted. Not yet in
// the app catalog: noindex, so no PublicHead (see catalog.ts).
export async function loader({ request }: Route.LoaderArgs) {
  const exam = new URL(request.url).searchParams.get('exam');
  return { exam: AI_DS_EXAMS.includes(exam as AiDsExam) ? exam as AiDsExam : null, playable: getPlayableAiDsSets() };
}

export default function AiDs({ loaderData: { exam, playable } }: Route.ComponentProps) {
  const t = useTranslations('App.aiDs') as unknown as DynamicT;
  const filters: { key: AiDsExam | null; label: string; href: string }[] = [
    { key: null, label: t('allExams'), href: '/ai-ds' },
    ...AI_DS_EXAMS.map(key => ({ key, label: t(`exams.${key}`), href: `/ai-ds?exam=${key}` })),
  ];
  return <>
    <title>{`${t('title')} | PAIBOT.app`}</title>
    <ToolLayout title={t('title')} centerTitle compact>
      <p className={styles.description}>{t('description')}</p>
      <nav className={styles.filter} aria-label={t('examFilter')}>
        <ul className={styles.chips}>
          {filters.map(filter => <li key={filter.key ?? 'all'}>
            <Link href={filter.href} className={styles.chip} aria-current={filter.key === exam ? 'page' : undefined}>{filter.label}</Link>
          </li>)}
        </ul>
      </nav>
      {AI_DS_CATALOG.map(unit => {
        const items = unit.items.filter(item => !exam || item.exams.includes(exam));
        return items.length > 0 && <section key={unit.id} className={styles.unit} aria-labelledby={`unit-${unit.id}`}>
          <h2 id={`unit-${unit.id}`} className={styles.unitTitle}>{t(`units.${unit.id}.title`)}</h2>
          <ul className={styles.items}>
            {items.map(item => {
              const ready = item.sets.some(set => playable.includes(`${unit.id}/${item.id}/${set.id}`));
              return <li key={item.id}>
                <Link href={`/ai-ds/${unit.id}/${item.id}`} className={styles.card} data-playable={ready || undefined}>
                  <span className={styles.cardTitle}>
                    {t(`units.${unit.id}.items.${item.id}.title`)}
                    {!ready && <span className={styles.badge}>{t('comingSoon')}</span>}
                  </span>
                  <ExamTags exams={item.exams} />
                </Link>
              </li>;
            })}
          </ul>
        </section>;
      })}
      <p className={styles.note}>{t('examNote')}</p>
    </ToolLayout>
  </>;
}
