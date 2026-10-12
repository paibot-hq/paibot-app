import KomaGame from './koma';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/koma" title={`${t('koma.title')} | PAIBOT`} description={t('koma.description')} /><KomaGame /></>;
}
