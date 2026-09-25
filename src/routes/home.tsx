import Cover from '../components/cover';
import PublicHead from '../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Home() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="" title={t('title')} description={t('description')} /><Cover year={new Date().getFullYear()} /></>;
}
