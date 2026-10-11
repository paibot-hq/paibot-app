import DateCalculator from './date-calculator';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/date-calc" title={`${t('dateCalc.title')} | PAIBOT.app`} description={t('dateCalc.description')} /><DateCalculator /></>;
}
