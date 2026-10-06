import WarningsView from './warnings-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/warnings" title={`${t('warnings.title')} | PAIBOT`} description={t('warnings.description')} /><WarningsView /></>;
}
