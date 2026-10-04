import SearchHome from '../components/search-home';
import PublicHead from '../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Home() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="" title={t('title')} description={t('description')} /><SearchHome year={new Date().getFullYear()} /></>;
}
