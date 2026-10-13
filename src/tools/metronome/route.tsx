import Metronome from './metronome-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/metronome" title={`${t('metronome.title')} | PAIBOT.app`} description={t('metronome.description')} /><Metronome /></>;
}
