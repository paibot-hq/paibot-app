import Circle from './circle';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/circle" title={`${t('circle.title')} | PAIBOT.app`} description={t('circle.description')} /><Circle /></>;
}
