import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { FACTORIZATION_SETS } from '../lib/math-factorization';
import styles from './math-factorization-index.module.css';

// Maps each pattern to its label key; a pattern-specific translation reads
// much better here than a generic "Problem set N" for every entry.
const LABEL_KEYS: Record<string, string> = {
  standard: 'setStandard',
  wide: 'setWide',
  differenceOfSquares: 'setDifferenceOfSquares',
};

export default function MathFactorizationIndex() {
  const locale = useLocale();
  const t = useTranslations('App.math.factorization');
  // Pattern label keys are only known at runtime, like the app categories in
  // src/lib/apps.tsx - cast once here, same reasoning.
  const td = t as unknown as DynamicT;
  return <><PublicHead locale={locale} path="/math/factorization" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')} layout="centered" centerTitle>
      <p className={styles.back}><Link href="/math">{`← ${t('backToMath')}`}</Link></p>
      <p>{t('chooseSet')}</p>
      <ul className={styles.sets}>
        {FACTORIZATION_SETS.map(({ id, pattern }) => (
          <li key={id}><Link href={`/math/factorization/${id}`}>{td(LABEL_KEYS[pattern])}</Link></li>
        ))}
      </ul>
    </ToolLayout>
  </>;
}
