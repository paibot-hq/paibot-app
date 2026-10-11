import FourierDrawing from './fourier-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/fourier" title={`${t('fourier.title')} | PAIBOT.app`} description={t('fourier.description')} /><FourierDrawing /></>;
}
