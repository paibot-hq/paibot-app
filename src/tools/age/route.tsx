import BirthYear from './birth-year';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/age" title={`${t('age.title')} | PAIBOT`} description={t('age.description')} /><BirthYear year={new Date().getFullYear()} /></>;
}
