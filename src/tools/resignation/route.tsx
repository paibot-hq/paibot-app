import Resignation from './resignation';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/resignation" title={`${t('resignation.title')} | PAIBOT.app`} description={t('resignation.description')} /><Resignation /></>;
}
