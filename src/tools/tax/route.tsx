import TaxCalculator from './tax-calculator';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/tax" title={`${t('tax.title')} | PAIBOT.app`} description={t('tax.description')} /><TaxCalculator /></>;
}
