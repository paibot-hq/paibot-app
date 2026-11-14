import PracticeItemPage from '../../components/practice/item-page';
import { itemData } from '../../lib/practice';
import { AI_DS_BOOK } from './catalog';
import { getAiDsLesson } from './lessons';
import { getPlayableAiDsSets } from './problems';
import type { Route } from './+types/item';

// /ai-ds/<unit>/<item>: the item's lesson and practice sets (components/practice/item-page.tsx).
export const loader = ({ params }: Route.LoaderArgs) => itemData(AI_DS_BOOK, params, getPlayableAiDsSets(), getAiDsLesson);

export default function AiDsItem({ loaderData }: Route.ComponentProps) {
  return <PracticeItemPage book={AI_DS_BOOK} {...loaderData} />;
}
