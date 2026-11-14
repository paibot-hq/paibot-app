import PracticeItemPage from '../../components/practice/item-page';
import { itemData } from '../../lib/practice';
import { CS_BOOK } from './catalog';
import { getCsLesson } from './lessons';
import { getPlayableCsSets } from './problems';
import type { Route } from './+types/item';

// /cs/<unit>/<item>: the item's lesson and practice sets (components/practice/item-page.tsx).
export const loader = ({ params }: Route.LoaderArgs) => itemData(CS_BOOK, params, getPlayableCsSets(), getCsLesson);

export default function CsItem({ loaderData }: Route.ComponentProps) {
  return <PracticeItemPage book={CS_BOOK} {...loaderData} />;
}
