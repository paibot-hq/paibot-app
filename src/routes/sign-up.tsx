import { SignUp } from '@clerk/react-router';
import { useLocale, useTranslations } from 'use-intl';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><title>{`${t('signUp')} | PAIBOT.app`}</title>
    <main className="auth-page"><SignUp routing="path" path={`/${locale}/sign-up`} /></main>
  </>;
}
