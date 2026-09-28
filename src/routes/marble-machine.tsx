import MarbleMachine from '../components/marble-machine';
import PublicHead from '../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/marble-machine" title={`${t('marbleMachine.title')} | PAIBOT.app`} description={t('marbleMachine.description')} /><MarbleMachine /></>;
}
