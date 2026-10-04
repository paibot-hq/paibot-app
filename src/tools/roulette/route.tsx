import RouletteWheel from './roulette-wheel';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/roulette" title={`${t('roulette.title')} | PAIBOT`} description={t('roulette.description')} /><RouletteWheel /></>;
}
