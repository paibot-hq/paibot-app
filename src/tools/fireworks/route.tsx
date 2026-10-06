import Fireworks from './fireworks';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/fireworks" title={`${t('fireworks.title')} | PAIBOT`} description={t('fireworks.description')} /><Fireworks /></>;
}
