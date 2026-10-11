import MetadataView from './metadata-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/metadata" title={`${t('metadata.title')} | PAIBOT.app`} description={t('metadata.description')} /><MetadataView /></>;
}
