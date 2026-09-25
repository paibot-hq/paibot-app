import DiceRoller from '../components/dice-roller';
import PublicHead from '../components/public-head';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/dice" title={`${t('dice.title')} | PAIBOT.app`} description={t('dice.description')} /><DiceRoller /></>;
}
