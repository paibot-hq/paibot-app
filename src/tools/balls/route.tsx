import Balls from './balls-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/balls" title={`${t('balls.title')} | PAIBOT`} description={t('balls.description')} /><Balls /></>;
}
