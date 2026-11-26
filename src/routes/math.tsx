import { useLocale, useTranslations } from 'use-intl';
import MathHomeHeader from '../components/math-home-header';
import MathUnitTable from '../components/math-unit-table';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import { getDoneSets } from '../lib/math-attempts.server';
import { getPlayableSets } from '../lib/math-problems.server';
import type { Route } from './+types/math';

export async function loader(args: Route.LoaderArgs) {
  const [playable, done] = await Promise.all([getPlayableSets(), getDoneSets(args)]);
  return { playable, done };
}

// One page for all of math: every unit and learning item, filtered in the browser; the tests are the other tab (/math/test).
export default function Math({ loaderData }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.math');
  return <><PublicHead locale={locale} path="/math" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')} compact>
      <MathHomeHeader mode="practice" />
      <MathUnitTable playable={loaderData.playable} done={loaderData.done} />
    </ToolLayout>
  </>;
}
