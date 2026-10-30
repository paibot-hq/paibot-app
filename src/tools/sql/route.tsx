import SqlRunner from './sql';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/sql" title={`${t('sql.title')} | PAIBOT.app`} description={t('sql.description')} /><SqlRunner /></>;
}
