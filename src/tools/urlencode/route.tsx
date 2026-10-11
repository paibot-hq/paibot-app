import UrlEncodeTool from './url-encode-tool';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/urlencode" title={`${t('urlencode.title')} | PAIBOT.app`} description={t('urlencode.description')} /><UrlEncodeTool /></>;
}
