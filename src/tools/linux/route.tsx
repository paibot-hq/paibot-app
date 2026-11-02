import Linux from './linux';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App.linux');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/linux" title={`${t('title')} | PAIBOT.app`} description={t('description')} /><Linux /></>;
}
