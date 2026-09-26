import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import { Link } from '../i18n/navigation';
import styles from './math.module.css';

export default function Math() {
  const locale = useLocale();
  const t = useTranslations('App.math');
  return <><PublicHead locale={locale} path="/math" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')} layout="centered" centerTitle>
      <p>{t('intro')}</p>
      <ul className={styles.units}>
        <li><Link href="/math/factorization/1">{t('factorizationLink')}</Link></li>
      </ul>
    </ToolLayout>
  </>;
}
