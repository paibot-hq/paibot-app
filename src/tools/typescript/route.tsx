import TypeScriptRunner from './typescript';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/typescript" title={`${t('typescript.title')} | PAIBOT.app`} description={t('typescript.description')} /><TypeScriptRunner /></>;
}
