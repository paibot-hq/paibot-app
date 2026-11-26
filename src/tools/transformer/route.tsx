import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../../components/public-head';
import ToolLayout from '../../components/tool-layout';
import TransformerView from './transformer-view';

export default function Page() {
  const t = useTranslations('App.transformer');
  const locale = useLocale();
  return <>
    <PublicHead locale={locale} path="/transformer" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')}>
      <TransformerView />
    </ToolLayout>
  </>;
}
