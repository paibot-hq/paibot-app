import NumberMerge from './number-merge';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/number-merge" title={`${t('numberMerge.title')} | PAIBOT.app`} description={t('numberMerge.description')} /><NumberMerge /></>;
}
