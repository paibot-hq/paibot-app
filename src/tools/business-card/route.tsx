import BusinessCard from './business-card';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/business-card" title={`${t('businessCard.title')} | PAIBOT.app`} description={t('businessCard.description')} /><BusinessCard /></>;
}
