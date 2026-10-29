import GoldfishEscapeGame from './goldfish-escape';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/goldfish-escape" title={`${t('goldfishEscape.title')} | PAIBOT.app`} description={t('goldfishEscape.description')} /><GoldfishEscapeGame /></>;
}
