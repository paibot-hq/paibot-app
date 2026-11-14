import { useBookT } from './use-book-t';
import type { PracticeBook } from '../../lib/practice';
import styles from './practice.module.css';

// The exams (or curricula) an item belongs to, as small tags (DS検定 · G検定 · E資格).
export default function ExamTags({ book, exams }: { book: PracticeBook; exams: readonly string[] }) {
  const tb = useBookT(book);
  return <span className={styles.tags}>
    {exams.map(exam => <span key={exam} className={styles.tag} data-exam={exam}>{tb(`exams.${exam}`)}</span>)}
  </span>;
}
