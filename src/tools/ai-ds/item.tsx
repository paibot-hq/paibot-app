import { useLocale, useTranslations } from 'use-intl';
import MathText from '../../components/math-text';
import { MathTex } from '../../components/math-tex';
import ToolLayout from '../../components/tool-layout';
import { Link } from '../../i18n/navigation';
import type { DynamicT } from '../../lib/apps';
import AiDsBreadcrumb from './breadcrumb';
import { AI_DS_CATALOG, findAiDsItem } from './catalog';
import { getAiDsLesson } from './lessons';
import { getPlayableAiDsSets } from './problems';
import ExamTags from './exam-tags';
import page from '../../routes/math-item.module.css';
import styles from './ai-ds.module.css';
import type { Route } from './+types/item';

// /ai-ds/<unit>/<item>: as math's item page (routes/math-item.tsx), top to bottom: what you learn (the topics), links within
// the page, the lesson (lessons.json: sections, then worked examples) if it has passed review, the practice sets (練習1, 2, ...)
// and the previous and next items of the unit.
export async function loader({ params }: Route.LoaderArgs) {
  const item = findAiDsItem(params.unit, params.item);
  if (!item) throw new Response('Not Found', { status: 404 });
  const items = AI_DS_CATALOG.find(unit => unit.id === params.unit)!.items;
  const at = items.indexOf(item);
  const playable = getPlayableAiDsSets();
  return {
    unit: params.unit!, item: item.id, exams: item.exams, lesson: getAiDsLesson(params.unit!, item.id),
    neighbors: { previous: items[at - 1]?.id ?? null, next: items[at + 1]?.id ?? null },
    sets: item.sets.map(set => ({ id: set.id, ready: playable.includes(`${params.unit}/${item.id}/${set.id}`) })),
  };
}

export default function AiDsItem({ loaderData: { unit, item, exams, lesson, neighbors, sets } }: Route.ComponentProps) {
  const t = useTranslations('App.aiDs') as unknown as DynamicT;
  const ti = useTranslations('App.aiDs.itemPage');
  const locale = useLocale();
  const title = t(`units.${unit}.items.${item}.title`);
  const start = sets.find(set => set.ready);
  return <>
    <title>{`${title} | ${t('title')} | PAIBOT.app`}</title>
    <ToolLayout title={title} centerTitle aboveTitle={<AiDsBreadcrumb crumbs={[{ label: title }]} />}>
      <p className={page.unit}><Link href={`/ai-ds#unit-${unit}`}>{t(`units.${unit}.title`)}</Link></p>
      <p className={styles.metaTags}><ExamTags exams={exams} /></p>
      <h2 className={page.about}>{ti('about')}</h2>
      <p className={page.description}>{t(`units.${unit}.items.${item}.topics`)}</p>
      {lesson && <nav className={page.lessonNav} aria-label={ti('pageNavigation')}>
        <a href="#explanation">{ti('explanation')}</a>
        <a href="#examples">{ti('examples')}</a>
        <a href="#practice">{ti('practice')}</a>
      </nav>}
      {start && <Link href={`/ai-ds/${unit}/${item}/${start.id}`} className={page.start}>
        {ti('start')}{sets.length > 1 && <span className={page.startSet}>{t('setLabel', { n: start.id })}</span>}
      </Link>}
      {locale !== 'ja' && <p className={page.description}><small>{t('problemsInJapanese')}</small></p>}
      {lesson?.sections.map((section, index) => <section key={index} id={index === 0 ? 'explanation' : undefined} className={page.lesson} lang="ja">
        <h2 className={page.lessonHeading}>{section.heading}</h2>
        {section.paragraphs.map((paragraph, at) => <p key={at}><MathText text={paragraph} /></p>)}
        {section.formulas?.map(formula => <div key={formula} className={page.formula}><MathTex tex={formula} block /></div>)}
        {section.after?.map((paragraph, at) => <p key={at}><MathText text={paragraph} /></p>)}
      </section>)}
      {lesson && lesson.examples.length > 0 && <section id="examples" className={page.lesson} lang="ja">
        <h2 className={page.lessonHeading}>{ti('examples')}</h2>
        {lesson.examples.map((example, index) => <div key={index} className={page.lessonExample}>
          <p className={page.exampleLabel}>{ti('exampleNumber', { number: index + 1 })}</p>
          <p className={styles.examplePrompt}><MathText text={example.prompt} /></p>
          <p className={styles.exampleHeading}>{ti('steps')}</p>
          <ol className={styles.exampleSteps}>{example.steps.map((step, at) => <li key={at}><MathText text={step} /></li>)}</ol>
          <p className={styles.exampleAnswer}><span className={page.noteLabel}>{ti('answer')}</span><MathText text={example.answer} /></p>
        </div>)}
      </section>}
      <h2 id="practice" className={page.choose}>{t('chooseSet')}</h2>
      <ul className={page.sets}>
        {sets.map(set => <li key={set.id}>
          <Link href={`/ai-ds/${unit}/${item}/${set.id}`} className={page.card} data-playable={set.ready || undefined}>
            <span className={page.cardTitle}>
              {t('setLabel', { n: set.id })}
              {!set.ready && <span className={page.badge}>{t('comingSoon')}</span>}
            </span>
          </Link>
        </li>)}
      </ul>
      {(neighbors.previous || neighbors.next) && <nav className={page.neighbors} aria-label={ti('neighbors')}>
        {neighbors.previous ? <Link href={`/ai-ds/${unit}/${neighbors.previous}`} rel="prev" className={page.neighbor}>
          <span className={page.neighborLabel}>← {ti('previous')}</span>
          <span>{t(`units.${unit}.items.${neighbors.previous}.title`)}</span>
        </Link> : <span />}
        {neighbors.next ? <Link href={`/ai-ds/${unit}/${neighbors.next}`} rel="next" className={`${page.neighbor} ${page.next}`}>
          <span className={page.neighborLabel}>{ti('next')} →</span>
          <span>{t(`units.${unit}.items.${neighbors.next}.title`)}</span>
        </Link> : <span />}
      </nav>}
    </ToolLayout>
  </>;
}
