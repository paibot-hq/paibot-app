import SplitCalculator from './split-calculator';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/split" title={`${t('split.title')} | PAIBOT.app`} description={t('split.description')} /><SplitCalculator /></>;
}
