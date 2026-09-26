import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { labelKeyForSet } from '../lib/math-factorization-sets';
import type { Route } from './+types/math-factorization';
import styles from './math-factorization.module.css';

// Same 404 pattern as locale.tsx's isLocale check: an invalid setId is a
// routing error, not a state the UI needs to render around.
export async function loader({ params }: Route.LoaderArgs) {
  const setId = Number(params.setId);
  if (!Number.isInteger(setId) || setId < 1) throw new Response('Not Found', { status: 404 });
  return { setId };
}

// The seeded procedural generator this page used to run on (see git
// history) is gone - problems are moving to LLM-generated, human-verified
// sets instead, not yet wired up. This keeps the routing/layout/labels
// shell working (and linkable) in the meantime.
export default function MathFactorization({ loaderData }: Route.ComponentProps) {
  const { setId } = loaderData;
  const locale = useLocale();
  const t = useTranslations('App.math.factorization');
  // Set label keys are only known at runtime, like the app categories in
  // src/lib/apps.tsx - cast once here, same reasoning.
  const td = t as unknown as DynamicT;
  const setLabel = td(labelKeyForSet(setId));
  const path = `/math/factorization/${setId}`;
  const backLink = <p className={styles.back}><Link href="/math/factorization">{`← ${t('backToSets')}`}</Link></p>;

  return <><PublicHead locale={locale} path={path} title={`${t('title')} - ${setLabel} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')} aboveTitle={backLink}>
      <div className={styles.quiz}>
        <p className={styles.setName}>{setLabel}</p>
        <p role="status">{t('setComingSoon')}</p>
      </div>
    </ToolLayout>
  </>;
}
