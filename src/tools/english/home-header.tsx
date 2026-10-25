import { useTranslations } from 'use-intl';
import { Link } from '../../i18n/navigation';
import styles from '../../components/math-home-header.module.css';

// The top of /english and /english/test: the two ways to use English practice, as tabs, as math's (components/math-home-header.tsx):
// practice (pick an item by level) and tests (a level at once).
export default function EnglishHomeHeader({ mode }: { mode: 'practice' | 'test' }) {
  const t = useTranslations('App.english');
  return <nav className={styles.modes} aria-label={t('modes.label')}>
    <Link href="/english" className={styles.mode} aria-current={mode === 'practice' ? 'page' : undefined} data-english-mode="practice">{t('modes.practice')}</Link>
    <Link href="/english/test" className={styles.mode} aria-current={mode === 'test' ? 'page' : undefined} data-english-mode="test">{t('modes.test')}</Link>
  </nav>;
}
