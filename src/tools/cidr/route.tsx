import CidrCalculator from './cidr-calculator';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/cidr" title={`${t('cidr.title')} | PAIBOT`} description={t('cidr.description')} /><CidrCalculator /></>;
}
