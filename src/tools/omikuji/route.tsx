import Omikuji from './omikuji';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/omikuji" title={`${t('omikuji.title')} | PAIBOT`} description={t('omikuji.description')} /><Omikuji /></>;
}
