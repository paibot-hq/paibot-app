import { useLocale, useTranslations } from 'use-intl';
import type { ReactNode } from 'react';
import MathText from '../math-text';
import { MathTex } from '../math-tex';
import ToolLayout from '../tool-layout';
import { Link } from '../../i18n/navigation';
import { useBookT } from './use-book-t';
import type { PracticeBook, PracticeLesson } from '../../lib/practice';
import PracticeBreadcrumb from './breadcrumb';
import ExamTags from './exam-tags';
import page from '../../routes/math-item.module.css';
import styles from './practice.module.css';

// <book>/<unit>/<item>: as math's item page (routes/math-item.tsx), top to bottom: what you learn (the topics), links within
// the page, the lesson (sections, then worked examples) if it has passed review, the practice sets (練習1, 2, ...) and the
// previous and next items of the unit. The lesson, problems and explanations are in Japanese.
export default function PracticeItemPage({ book, unit, item, exams, lesson, neighbors, sets, related, connections }: {
  book: PracticeBook; unit: string; item: string; exams: readonly string[]; lesson: PracticeLesson | null;
  neighbors: { previous: string | null; next: string | null }; sets: { id: string; ready: boolean }[];
  related?: ReactNode;
  connections?: ReactNode;
}) {
  const t = useBookT(book);
  const tp = useTranslations('App.practice');
  const ti = useTranslations('App.practice.itemPage');
  const locale = useLocale();
  const title = t(`units.${unit}.items.${item}.title`);
  const start = sets.find(set => set.ready);
  return <>
    <title>{`${title} | ${t('title')} | PAIBOT.app`}</title>
    <ToolLayout title={title} centerTitle aboveTitle={<PracticeBreadcrumb book={book} crumbs={[{ label: title }]} />}>
      <p className={page.unit}><Link href={`${book.base}#unit-${unit}`}>{t(`units.${unit}.title`)}</Link></p>
      <p className={styles.metaTags}><ExamTags book={book} exams={exams} /></p>
      <h2 className={page.about}>{ti('about')}</h2>
      <p className={page.description}>{t(`units.${unit}.items.${item}.topics`)}</p>
      {lesson && <nav className={page.lessonNav} aria-label={ti('pageNavigation')}>
        <a href="#explanation">{ti('explanation')}</a>
        <a href="#examples">{ti('examples')}</a>
        <a href="#practice">{ti('practice')}</a>
        {related}
      </nav>}
      {start && <Link href={`${book.base}/${unit}/${item}/${start.id}`} className={page.start}>
        {ti('start')}{sets.length > 1 && <span className={page.startSet}>{tp('setLabel', { n: start.id })}</span>}
      </Link>}
      {connections}
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
      <h2 id="practice" className={page.choose}>{tp('chooseSet')}</h2>
      <ul className={page.sets}>
        {sets.map(set => <li key={set.id}>
          <Link href={`${book.base}/${unit}/${item}/${set.id}`} className={page.card} data-playable={set.ready || undefined}>
            <span className={page.cardTitle}>
              {tp('setLabel', { n: set.id })}
              {!set.ready && <span className={page.badge}>{tp('comingSoon')}</span>}
            </span>
          </Link>
        </li>)}
      </ul>
      {(neighbors.previous || neighbors.next) && <nav className={page.neighbors} aria-label={ti('neighbors')}>
        {neighbors.previous ? <Link href={`${book.base}/${unit}/${neighbors.previous}`} rel="prev" className={page.neighbor}>
          <span className={page.neighborLabel}>← {ti('previous')}</span>
          <span>{t(`units.${unit}.items.${neighbors.previous}.title`)}</span>
        </Link> : <span />}
        {neighbors.next ? <Link href={`${book.base}/${unit}/${neighbors.next}`} rel="next" className={`${page.neighbor} ${page.next}`}>
          <span className={page.neighborLabel}>{ti('next')} →</span>
          <span>{t(`units.${unit}.items.${neighbors.next}.title`)}</span>
        </Link> : <span />}
      </nav>}
    </ToolLayout>
  </>;
}
