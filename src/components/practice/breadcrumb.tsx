import { useTranslations } from 'use-intl';
import { Link } from '../../i18n/navigation';
import { useBookT } from './use-book-t';
import type { PracticeBook } from '../../lib/practice';
import styles from '../math-breadcrumb.module.css';

export interface PracticeCrumb { label: string; href?: string }

// Where the page sits: the book > learning item > set, as math's breadcrumb (components/math-breadcrumb.tsx).
// The last crumb is the current page and is not a link.
export default function PracticeBreadcrumb({ book, crumbs }: { book: PracticeBook; crumbs: PracticeCrumb[] }) {
  const tb = useBookT(book);
  const tp = useTranslations('App.practice');
  const trail: PracticeCrumb[] = [{ label: tb('title'), href: book.base }, ...crumbs];
  return <nav aria-label={tp('breadcrumb')} className={styles.nav}>
    <ol className={styles.list}>
      {trail.map(({ label, href }, index) => (
        <li key={index} className={styles.crumb}>
          {href && index < trail.length - 1 ? <Link href={href}>{label}</Link> : <span aria-current={index === trail.length - 1 ? 'page' : undefined}>{label}</span>}
        </li>
      ))}
    </ol>
  </nav>;
}
