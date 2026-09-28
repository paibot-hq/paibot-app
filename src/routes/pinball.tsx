import PinballGame from '../components/pinball';
import PublicHead from '../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/pinball" title={`${t('pinball.title')} | PAIBOT.app`} description={t('pinball.description')} /><PinballGame /></>;
}
