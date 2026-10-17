import FruitMergeGame from './fruit-merge';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/fruit-merge" title={`${t('fruitMerge.title')} | PAIBOT.app`} description={t('fruitMerge.description')} /><FruitMergeGame /></>;
}
