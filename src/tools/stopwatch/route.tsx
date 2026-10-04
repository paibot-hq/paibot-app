import Stopwatch from './stopwatch';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/stopwatch" title={`${t('stopwatch.title')} | PAIBOT`} description={t('stopwatch.description')} /><Stopwatch /></>;
}
