import Pachinko from '../components/pachinko';
import PublicHead from '../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/pachinko" title={`${t('pachinko.title')} | PAIBOT.app`} description={t('pachinko.description')} /><Pachinko /></>;
}
