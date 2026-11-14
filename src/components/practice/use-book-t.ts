import { useTranslations } from 'use-intl';
import type { DynamicT } from '../../lib/apps';
import type { PracticeBook } from '../../lib/practice';

// The book's own messages (App.<book.messages>: its title, exams and units), by key.
export function useBookT(book: PracticeBook): DynamicT {
  const t = useTranslations('App') as unknown as DynamicT;
  return (key, values) => t(`${book.messages}.${key}`, values);
}
