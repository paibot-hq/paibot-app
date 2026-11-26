import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../../components/public-head';
import ToolLayout from '../../components/tool-layout';
import BackpropView from './backprop-view';

export default function Page() {
  const t = useTranslations('App.backprop');
  const locale = useLocale();
  return <>
    <PublicHead locale={locale} path="/backprop" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')}>
      <BackpropView />
    </ToolLayout>
  </>;
}
