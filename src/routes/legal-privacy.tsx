import { useLocale } from 'use-intl';
import { LegalPage } from '../components/legal-page';
import PublicHead from '../components/public-head';
import { privacy } from '../content/legal';
import type { Locale } from '../i18n/routing';

export default function Page() {
  const locale = useLocale() as Locale;
  const document = privacy[locale];
  return <><PublicHead locale={locale} path="/legal/privacy" title={`${document.title} | PAIBOT`} description={document.description} />
    <LegalPage document={document} />
  </>;
}
