import CollectorView from './collector-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/collector" title={`${t('collector.title')} | PAIBOT.app`} description={t('collector.description')} /><CollectorView /></>;
}
