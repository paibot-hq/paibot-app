import DoublePendulum from './pendulum-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/pendulum" title={`${t('pendulum.title')} | PAIBOT`} description={t('pendulum.description')} /><DoublePendulum /></>;
}
