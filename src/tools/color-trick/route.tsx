import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../../components/public-head';
import ColorTrick from './color-trick';
export default function Page() {
  const t = useTranslations('App.colorTrick');
  return <><PublicHead locale={useLocale()} path="/color-trick" title={`${t('title')} | PAIBOT.app`} description={t('description')} /><ColorTrick /></>;
}
