import { useTranslations } from 'use-intl';
import ToolLayout from '../tool-layout';
import { Link } from '../../i18n/navigation';
import { useBookT } from './use-book-t';
import type { PracticeBook } from '../../lib/practice';
import ExamTags from './exam-tags';
import styles from './practice.module.css';

// A book's top page: every learning item by unit, each linking to its page and tagged with the exams it belongs to. ?exam=x
// shows one exam's items only (links, so it works before the page's script has loaded). Items with published problems are
// highlighted. A book not yet in the app catalog is noindex, so there is no PublicHead.
export default function PracticeHome({ book, exam, playable }: { book: PracticeBook; exam: string | null; playable: string[] }) {
  const tb = useBookT(book);
  const tp = useTranslations('App.practice');
  const filters: { key: string | null; label: string; href: string }[] = [
    { key: null, label: tp('allExams'), href: book.base },
    ...book.exams.map(key => ({ key, label: tb(`exams.${key}`), href: `${book.base}?exam=${key}` })),
  ];
  return <>
    <title>{`${tb('title')} | PAIBOT.app`}</title>
    <ToolLayout title={tb('title')} centerTitle compact>
      <p className={styles.description}>{tb('description')}</p>
      <nav className={styles.filter} aria-label={tp('examFilter')}>
        <ul className={styles.chips}>
          {filters.map(filter => <li key={filter.key ?? 'all'}>
            <Link href={filter.href} className={styles.chip} aria-current={filter.key === exam ? 'page' : undefined}>{filter.label}</Link>
          </li>)}
        </ul>
      </nav>
      {book.catalog.map(unit => {
        const items = unit.items.filter(item => !exam || (item.exams as readonly string[]).includes(exam));
        return items.length > 0 && <section key={unit.id} className={styles.unit} aria-labelledby={`unit-${unit.id}`}>
          <h2 id={`unit-${unit.id}`} className={styles.unitTitle}>{tb(`units.${unit.id}.title`)}</h2>
          <ul className={styles.items}>
            {items.map(item => {
              const ready = item.sets.some(set => playable.includes(`${unit.id}/${item.id}/${set.id}`));
              return <li key={item.id}>
                <Link href={`${book.base}/${unit.id}/${item.id}`} className={styles.card} data-playable={ready || undefined}>
                  <span className={styles.cardTitle}>
                    {tb(`units.${unit.id}.items.${item.id}.title`)}
                    {!ready && <span className={styles.badge}>{tp('comingSoon')}</span>}
                  </span>
                  <ExamTags book={book} exams={item.exams} />
                </Link>
              </li>;
            })}
          </ul>
        </section>;
      })}
      <p className={styles.note}>{tb('examNote')}</p>
    </ToolLayout>
  </>;
}
