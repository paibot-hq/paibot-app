import IpLookup from './ip-lookup';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/ip" title={`${t('ip.title')} | PAIBOT`} description={t('ip.description')} /><IpLookup /></>;
}
