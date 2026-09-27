import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import { Link } from '../i18n/navigation';
import styles from './math.module.css';

export default function Math() {
  const locale = useLocale();
  const t = useTranslations('App.math');
  const units = [
    { href: '/math/arith', label: t('arithLink'), summary: t('arithSummary') },
    { href: '/math/signed', label: t('signedLink'), summary: t('signedSummary') },
    { href: '/math/factorization', label: t('factorizationLink'), summary: t('factorizationSummary') },
  ];
  return <><PublicHead locale={locale} path="/math" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')} centerTitle>
      <p>{t('intro')}</p>
      <ul className={styles.units}>
        {units.map(({ href, label, summary }) => (
          <li key={href}>
            <Link href={href} className={styles.card}>
              <span className={styles.cardTitle}>{label}</span>
              <span className={styles.cardDescription}>{summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </ToolLayout>
  </>;
}
