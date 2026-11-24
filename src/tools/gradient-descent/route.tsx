import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../../components/public-head';
import ToolLayout from '../../components/tool-layout';
import { GRADIENT_DESCENT_PATH } from '../../lib/app-catalog';
import GradientDescent from './gradient-descent-view';

export default function Page() {
  const t = useTranslations('App.gradientDescent');
  const locale = useLocale();
  return <>
    <PublicHead locale={locale} path={GRADIENT_DESCENT_PATH} title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')} centerTitle>
      <GradientDescent />
    </ToolLayout>
  </>;
}
