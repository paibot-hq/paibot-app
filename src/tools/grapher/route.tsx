import Grapher from './grapher-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/grapher" title={`${t('grapher.title')} | PAIBOT.app`} description={t('grapher.description')} /><Grapher /></>;
}
