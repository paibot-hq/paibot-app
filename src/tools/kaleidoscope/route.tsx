import Kaleidoscope from './kaleidoscope-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/kaleidoscope" title={`${t('kaleidoscope.title')} | PAIBOT.app`} description={t('kaleidoscope.description')} /><Kaleidoscope /></>;
}
