import UnitConverter from './unit-converter';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/unit-converter" title={`${t("unitConverter.title")} | PAIBOT.app`} description={t("unitConverter.description")} /><UnitConverter /></>;
}
