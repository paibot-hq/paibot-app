import GoldfishBowl from './goldfish-bowl';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/goldfish" title={`${t('goldfish.title')} | PAIBOT.app`} description={t('goldfish.description')} /><GoldfishBowl /></>;
}
