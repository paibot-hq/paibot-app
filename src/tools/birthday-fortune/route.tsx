import BirthdayFortune from './birthday-fortune';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/birthday-fortune" title={`${t('birthdayFortune.title')} | PAIBOT`} description={t('birthdayFortune.description')} /><BirthdayFortune /></>;
}
