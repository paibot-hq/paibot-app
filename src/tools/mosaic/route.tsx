import MosaicView from './mosaic-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/mosaic" title={`${t('mosaic.title')} | PAIBOT.app`} description={t('mosaic.description')} /><MosaicView /></>;
}
