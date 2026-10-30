import JavaScriptRunner from './javascript';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/javascript" title={`${t('javascript.title')} | PAIBOT.app`} description={t('javascript.description')} /><JavaScriptRunner /></>;
}
