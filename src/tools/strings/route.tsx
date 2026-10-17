import StringsView from './strings-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/strings" title={`${t('strings.title')} | PAIBOT.app`} description={t('strings.description')} /><StringsView /></>;
}
