import { useTranslations } from 'use-intl';
import { Link } from '../i18n/navigation';
import type { MathSetRecord } from '../lib/math-attempts';
import ToolLayout from './tool-layout';
import styles from './math-set-picker.module.css';

// `record` is present only for a signed-in user who has finished the set;
// `comingSoon` marks a set that has no problems yet.
export interface MathSetCard { href: string; label: string; description: string; record?: MathSetRecord; comingSoon?: boolean }

// The set-choosing page shared by every /math unit.
export default function MathSetPicker({ title, sets }: { title: string; sets: MathSetCard[] }) {
  const t = useTranslations('App.math.quiz');
  const tm = useTranslations('App.math');
  return <ToolLayout title={title} centerTitle aboveTitle={<p className={styles.back}><Link href="/math">{`← ${t('backToMath')}`}</Link></p>}>
    <p>{t('chooseSet')}</p>
    <ul className={styles.sets}>
      {sets.map(({ href, label, description, record, comingSoon }) => (
        <li key={href}>
          <Link href={href} className={styles.card}>
            <span className={styles.cardTitle}>{label}{comingSoon && <span className={styles.badge}>{tm('comingSoon')}</span>}</span>
            <span className={styles.cardDescription}>{description}</span>
            {record && <span className={styles.cardRecord}>{t('record', { last: record.last, best: record.best, total: record.total })}</span>}
          </Link>
        </li>
      ))}
    </ul>
  </ToolLayout>;
}
