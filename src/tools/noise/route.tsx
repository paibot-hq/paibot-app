import Noise from './noise-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/noise" title={`${t('noise.title')} | PAIBOT.app`} description={t('noise.description')} /><Noise /></>;
}
