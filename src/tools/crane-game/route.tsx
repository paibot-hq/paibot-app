import CraneGame from './crane-game';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/crane-game" title={`${t('craneGame.title')} | PAIBOT.app`} description={t('craneGame.description')} /><CraneGame /></>;
}
