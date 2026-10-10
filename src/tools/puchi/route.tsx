import Puchi from './puchi';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/puchi" title={`${t('puchi.title')} | PAIBOT`} description={t('puchi.description')} /><Puchi /></>;
}
