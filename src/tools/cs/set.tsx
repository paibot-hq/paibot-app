import PracticeSetPage from '../../components/practice/set-page';
import { setData } from '../../lib/practice';
import { CS_BOOK } from './catalog';
import { getCsSet } from './problems';
import type { Route } from './+types/set';

// /cs/<unit>/<item>/<set>: a five-problem quiz (components/practice/set-page.tsx).
export const loader = ({ params }: Route.LoaderArgs) => setData(CS_BOOK, params, getCsSet);

export default function CsSet({ loaderData }: Route.ComponentProps) {
  return <PracticeSetPage book={CS_BOOK} {...loaderData} />;
}
