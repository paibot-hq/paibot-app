import { useLocale } from 'use-intl';
import { CommercePage } from '../components/legal-page';
import { commerce } from '../content/legal';
import type { Locale } from '../i18n/routing';

export default function Page() {
  const locale = useLocale() as Locale;
  const document = commerce[locale];
  // Not PublicHead: this page is noindex (workers/app.ts, root.tsx), so it has no canonical or language alternates.
  return <><title>{`${document.title} | PAIBOT`}</title><meta name="description" content={document.description} />
    <CommercePage document={document} />
  </>;
}
