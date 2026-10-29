import AppList from '../components/app-list';
import PublicHead from '../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/apps" title={`${t('appList.title')} | PAIBOT.app`} description={t('appList.description')} /><AppList year={new Date().getFullYear()} /></>;
}
