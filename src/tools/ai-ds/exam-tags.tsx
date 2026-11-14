import { useTranslations } from 'use-intl';
import type { DynamicT } from '../../lib/apps';
import type { AiDsExam } from './catalog';
import styles from './ai-ds.module.css';

// The exams an item belongs to, as small tags (DS検定 · G検定 · E資格).
export default function ExamTags({ exams }: { exams: readonly AiDsExam[] }) {
  const t = useTranslations('App.aiDs') as unknown as DynamicT;
  return <span className={styles.tags}>
    {exams.map(exam => <span key={exam} className={styles.tag} data-exam={exam}>{t(`exams.${exam}`)}</span>)}
  </span>;
}
