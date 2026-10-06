import QuakeView from './quake-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/quake" title={`${t('quake.title')} | PAIBOT`} description={t('quake.description')} /><QuakeView /></>;
}
