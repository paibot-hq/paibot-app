import { useTranslations } from 'use-intl';
import { Link } from '../i18n/navigation';
import styles from './math-breadcrumb.module.css';

export interface MathCrumb { label: string; href?: string }

// Where the page sits in Math: Math > unit > learning item > set.
// The last crumb is the current page and is not a link.
export default function MathBreadcrumb({ crumbs }: { crumbs: MathCrumb[] }) {
  const t = useTranslations('App.math.quiz');
  const trail: MathCrumb[] = [{ label: t('backToMath'), href: '/math' }, ...crumbs];
  return <nav aria-label={t('breadcrumb')} className={styles.nav}>
    <ol className={styles.list}>
      {trail.map(({ label, href }, index) => (
        <li key={index} className={styles.crumb}>
          {href && index < trail.length - 1 ? <Link href={href}>{label}</Link> : <span aria-current={index === trail.length - 1 ? 'page' : undefined}>{label}</span>}
        </li>
      ))}
    </ol>
  </nav>;
}
