import BreachesView from './breaches-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/breaches" title={`${t('breaches.title')} | PAIBOT.app`} description={t('breaches.description')} /><BreachesView /></>;
}
