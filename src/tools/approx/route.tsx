import ApproxView from './approx-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/approx" title={`${t('approx.title')} | PAIBOT.app`} description={t('approx.description')} /><ApproxView /></>;
}
