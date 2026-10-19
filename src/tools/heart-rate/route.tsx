import HeartRate from './heart-rate-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/heart-rate" title={`${t('heartRate.title')} | PAIBOT.app`} description={t('heartRate.description')} /><HeartRate /></>;
}
