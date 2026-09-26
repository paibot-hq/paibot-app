import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { FACTORIZATION_SETS } from '../lib/math-factorization-sets';
import styles from './math-factorization-index.module.css';

export default function MathFactorizationIndex() {
  const locale = useLocale();
  const t = useTranslations('App.math.factorization');
  // Pattern label keys are only known at runtime, like the app categories in
  // src/lib/apps.tsx - cast once here, same reasoning.
  const td = t as unknown as DynamicT;
  return <><PublicHead locale={locale} path="/math/factorization" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')} centerTitle aboveTitle={<p className={styles.back}><Link href="/math">{`← ${t('backToMath')}`}</Link></p>}>
      <p>{t('chooseSet')}</p>
      <ul className={styles.sets}>
        {FACTORIZATION_SETS.map(({ id, labelKey, descriptionKey }) => (
          <li key={id}>
            <Link href={`/math/factorization/${id}`} className={styles.card}>
              <span className={styles.cardTitle}>{td(labelKey)}</span>
              <span className={styles.cardDescription}>{td(descriptionKey)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </ToolLayout>
  </>;
}
