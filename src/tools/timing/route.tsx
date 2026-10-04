import TimingGame from './timing-game';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/timing" title={`${t('timing.title')} | PAIBOT`} description={t('timing.description')} /><TimingGame /></>;
}
