import { SignIn } from '@clerk/react-router';
import { useSearchParams } from 'react-router';
import { useLocale, useTranslations } from 'use-intl';
import { safeRedirectTarget } from '../i18n/navigation';
export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  const [searchParams] = useSearchParams();
  const redirectTarget = safeRedirectTarget(searchParams.get('redirect_url'), locale);
  return <><title>{`${t('signIn')} | PAIBOT.app`}</title>
    <main className="auth-page"><SignIn routing="path" path={`/${locale}/sign-in`} forceRedirectUrl={redirectTarget} /></main>
  </>;
}
