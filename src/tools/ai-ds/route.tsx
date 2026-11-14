import PracticeHome from '../../components/practice/home';
import { homeData } from '../../lib/practice';
import { AI_DS_BOOK } from './catalog';
import { getPlayableAiDsSets } from './problems';
import type { Route } from './+types/route';

// /ai-ds: every learning item by unit (components/practice/home.tsx). Not yet in the app catalog: noindex (see catalog.ts).
export const loader = ({ request }: Route.LoaderArgs) => homeData(AI_DS_BOOK, request, getPlayableAiDsSets());

export default function AiDs({ loaderData }: Route.ComponentProps) {
  return <PracticeHome book={AI_DS_BOOK} {...loaderData} />;
}
