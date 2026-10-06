import SeriesView from './series-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/series" title={`${t('series.title')} | PAIBOT`} description={t('series.description')} /><SeriesView /></>;
}
