import RandomVideo from './random-video-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/random-video" title={`${t('randomVideo.title')} | PAIBOT.app`} description={t('randomVideo.description')} /><RandomVideo /></>;
}
