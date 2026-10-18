import GlitchNoise from './glitch-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/glitch" title={`${t('glitch.title')} | PAIBOT.app`} description={t('glitch.description')} /><GlitchNoise /></>;
}
