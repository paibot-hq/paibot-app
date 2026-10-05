import Polyhedra from './polyhedra-view';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/polyhedra" title={`${t('polyhedra.title')} | PAIBOT`} description={t('polyhedra.description')} /><Polyhedra /></>;
}
