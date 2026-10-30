import PythonRunner from './python';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/python" title={`${t('python.title')} | PAIBOT.app`} description={t('python.description')} /><PythonRunner /></>;
}
