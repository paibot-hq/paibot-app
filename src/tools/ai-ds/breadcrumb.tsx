import { useTranslations } from 'use-intl';
import { Link } from '../../i18n/navigation';
import styles from '../../components/math-breadcrumb.module.css';

export interface AiDsCrumb { label: string; href?: string }

// Where the page sits: the problem sets > learning item > set, as math's breadcrumb (components/math-breadcrumb.tsx).
// The last crumb is the current page and is not a link.
export default function AiDsBreadcrumb({ crumbs }: { crumbs: AiDsCrumb[] }) {
  const t = useTranslations('App.aiDs');
  const trail: AiDsCrumb[] = [{ label: t('title'), href: '/ai-ds' }, ...crumbs];
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
