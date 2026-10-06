import FaqView from './faq-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/faq" title={`${t('faq.title')} | PAIBOT`} description={t('faq.description')} /><FaqView /></>;
}
