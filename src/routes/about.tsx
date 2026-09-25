import About from '../components/about';
import PublicHead from '../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/about" title={t('about.title')} description={t('about.body')} /><About year={new Date().getFullYear()} /></>;
}
