import BrowserAi from './browser-ai';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/browser-ai" title={`${t('browserAi.title')} | PAIBOT.app`} description={t('browserAi.description')} /><BrowserAi /></>;
}
