import ArithmeticPractice from '../components/arithmetic-practice';
import PublicHead from '../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/arith" title={`${t('arith.title')} | PAIBOT.app`} description={t('arith.description')} /><ArithmeticPractice /></>;
}
