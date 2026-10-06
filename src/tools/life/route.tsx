import LifeGame from './life-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/life" title={`${t('life.title')} | PAIBOT`} description={t('life.description')} /><LifeGame /></>;
}
