import { useTranslations } from 'use-intl';
import ToolLayout from '../tool-layout';
import { useBookT } from './use-book-t';
import type { PracticeBook, PracticeQuestion } from '../../lib/practice';
import PracticeBreadcrumb from './breadcrumb';
import PracticeQuiz from './quiz';
import styles from './practice.module.css';

// <book>/<unit>/<item>/<set>: a five-problem, four-choice quiz (quiz.tsx), or "being prepared" while the set has no published
// problems. Then on to the item's next set, if any.
export default function PracticeSetPage({ book, unit, item, set, next, questions }: {
  book: PracticeBook; unit: string; item: string; set: string; next: string | null; questions: PracticeQuestion[];
}) {
  const tb = useBookT(book);
  const tp = useTranslations('App.practice');
  const itemTitle = tb(`units.${unit}.items.${item}.title`);
  const title = tp('setLabel', { n: set });
  const crumbs = [{ label: itemTitle, href: `${book.base}/${unit}/${item}` }, { label: title }];
  const head = <title>{`${itemTitle} ${title} | ${tb('title')} | PAIBOT.app`}</title>;
  if (!questions.length) return <>
    {head}
    <ToolLayout title={itemTitle} aboveTitle={<PracticeBreadcrumb book={book} crumbs={crumbs} />}>
      <p className={styles.meta}>{title}</p>
      <p className={styles.preparing}>{tp('preparing')}</p>
    </ToolLayout>
  </>;
  return <>
    {head}
    {/* key: moving to the next set starts a fresh quiz. */}
    <PracticeQuiz key={`${unit}/${item}/${set}`} book={book} title={itemTitle} setLabel={title} questions={questions} crumbs={crumbs}
      next={next ? { href: `${book.base}/${unit}/${item}/${next}`, label: tp('setLabel', { n: next }) } : null} />
  </>;
}
