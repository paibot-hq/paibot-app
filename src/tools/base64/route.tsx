import Base64Tool from './base64-tool';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/base64" title={`${t('base64.title')} | PAIBOT`} description={t('base64.description')} /><Base64Tool /></>;
}
