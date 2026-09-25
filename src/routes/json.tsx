import JsonTool from '../components/json-tool';
import PublicHead from '../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/json" title={`${t('json.title')} | PAIBOT.app`} description={t('json.description')} /><JsonTool /></>;
}
