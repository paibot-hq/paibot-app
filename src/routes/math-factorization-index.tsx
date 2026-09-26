import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import { Link } from '../i18n/navigation';
import { FACTORIZATION_SET_IDS } from '../lib/math-factorization';
import styles from './math-factorization-index.module.css';

export default function MathFactorizationIndex() {
  const locale = useLocale();
  const t = useTranslations('App.math.factorization');
  return <><PublicHead locale={locale} path="/math/factorization" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')} layout="centered" centerTitle>
      <p>{t('chooseSet')}</p>
      <ul className={styles.sets}>
        {FACTORIZATION_SET_IDS.map(setId => (
          <li key={setId}><Link href={`/math/factorization/${setId}`}>{t('setLabel', { id: setId })}</Link></li>
        ))}
      </ul>
    </ToolLayout>
  </>;
}
