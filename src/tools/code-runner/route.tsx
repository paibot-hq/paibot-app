import CodeRunner from './code-runner';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/code-runner" title={`${t('codeRunner.title')} | PAIBOT.app`} description={t('codeRunner.description')} /><CodeRunner /></>;
}
