import PomodoroTimer from './pomodoro-timer';
import PublicHead from '../../components/public-head';
import { useLocale, useTranslations } from 'use-intl';

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/pomodoro" title={`${t('pomodoro.title')} | PAIBOT.app`} description={t('pomodoro.description')} /><PomodoroTimer /></>;
}
