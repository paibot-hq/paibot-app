import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../../components/public-head';
import ToolLayout from '../../components/tool-layout';
import AttentionView from './attention-view';

export default function Page() {
  const t = useTranslations('App.attention');
  const locale = useLocale();
  return <>
    <PublicHead locale={locale} path="/attention" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')}>
      <AttentionView />
    </ToolLayout>
  </>;
}
