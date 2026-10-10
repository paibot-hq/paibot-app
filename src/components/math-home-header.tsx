import { useEffect, useState } from 'react';
import { useTranslations } from 'use-intl';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { MATH_CATALOG } from '../lib/math-catalog';
import { readResume, type MathResume } from '../lib/math-resume';
import styles from './math-home-header.module.css';

// The top of /math and /math/test: back to the set last opened (once there is one), and the two ways to use Math, as tabs: practice
// (pick a topic from the areas) and tests (a school year, a Suken level or several years at once).
export default function MathHomeHeader({ mode }: { mode: 'practice' | 'test' }) {
  const t = useTranslations('App.math');
  const td = t as unknown as DynamicT;
  const [resume, setResume] = useState<MathResume | null>(null);
  useEffect(() => { setResume(readResume()); }, []);
  const several = resume && (MATH_CATALOG.find(unit => unit.id === resume.unit)?.items.find(item => item.id === resume.item)?.sets.length ?? 0) > 1;
  return <>
    {resume && <Link href={`/math/${resume.unit}/${resume.item}/${resume.set}`} className={styles.resume} data-math-resume>
      <span className={styles.resumeLabel}>{t('quiz.resume')}</span>
      <span className={styles.resumeName}>{td(`units.${resume.unit}.items.${resume.item}.title`)}{several && ` ${t('quiz.practice', { number: resume.set })}`}</span>
    </Link>}
    <nav className={styles.modes} aria-label={t('modes.label')}>
      <Link href="/math" className={styles.mode} aria-current={mode === 'practice' ? 'page' : undefined} data-math-mode="practice">{t('modes.practice')}</Link>
      <Link href="/math/test" className={styles.mode} aria-current={mode === 'test' ? 'page' : undefined} data-math-mode="test">{t('modes.test')}</Link>
    </nav>
  </>;
}
