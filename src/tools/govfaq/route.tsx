import FaqView from './govfaq-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/govfaq" title={`${t('govfaq.title')} | PAIBOT`} description={t('govfaq.description')} /><FaqView /></>;
}
