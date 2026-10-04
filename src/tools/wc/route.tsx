import CharCount from './char-count';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/wc" title={`${t('wc.title')} | PAIBOT`} description={t('wc.description')} /><CharCount /></>;
}
