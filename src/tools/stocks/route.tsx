import Stocks from './stocks-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/stocks" title={`${t('stocks.title')} | PAIBOT.app`} description={t('stocks.description')} /><Stocks /></>;
}
