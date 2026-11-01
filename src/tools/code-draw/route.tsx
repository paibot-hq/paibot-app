import CodeDraw from './code-draw';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/code-draw" title={`${t('codeDraw.title')} | PAIBOT.app`} description={t('codeDraw.description')} /><CodeDraw /></>;
}
