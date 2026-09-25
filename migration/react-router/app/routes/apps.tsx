import Apps from '../components/apps';
import PublicHead from '../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/apps" title={t('apps.title')} description={t('description')} /><Apps year={new Date().getFullYear()} /></>;
}
