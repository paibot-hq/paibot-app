import PracticeSetPage from '../../components/practice/set-page';
import { setData } from '../../lib/practice';
import { AI_DS_BOOK } from './catalog';
import { getAiDsSet } from './problems';
import type { Route } from './+types/set';

// /ai-ds/<unit>/<item>/<set>: a five-problem quiz (components/practice/set-page.tsx).
export const loader = ({ params }: Route.LoaderArgs) => setData(AI_DS_BOOK, params, getAiDsSet);

export default function AiDsSet({ loaderData }: Route.ComponentProps) {
  return <PracticeSetPage book={AI_DS_BOOK} {...loaderData} />;
}
