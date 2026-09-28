import { useLocale } from 'use-intl';
import { CommercePage } from '../components/legal-page';
import PublicHead from '../components/public-head';
import { commerce } from '../content/legal';
import type { Locale } from '../i18n/routing';

export default function Page() {
  const locale = useLocale() as Locale;
  const document = commerce[locale];
  return <><PublicHead locale={locale} path="/legal/commerce" title={`${document.title} | PAIBOT.app`} description={document.description} />
    <CommercePage document={document} />
  </>;
}
