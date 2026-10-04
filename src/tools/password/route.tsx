import PasswordGenerator from './password-generator';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/password" title={`${t('password.title')} | PAIBOT`} description={t('password.description')} /><PasswordGenerator /></>;
}
