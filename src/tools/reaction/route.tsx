import ReactionTest from './reaction-test';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/reaction" title={`${t('reaction.title')} | PAIBOT.app`} description={t('reaction.description')} /><ReactionTest /></>;
}
