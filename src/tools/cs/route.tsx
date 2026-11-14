import PracticeHome from '../../components/practice/home';
import { homeData } from '../../lib/practice';
import { CS_BOOK } from './catalog';
import { getPlayableCsSets } from './problems';
import type { Route } from './+types/route';

// /cs: every learning item by unit (components/practice/home.tsx). Not yet in the app catalog: noindex (see catalog.ts).
export const loader = ({ request }: Route.LoaderArgs) => homeData(CS_BOOK, request, getPlayableCsSets());

export default function Cs({ loaderData }: Route.ComponentProps) {
  return <PracticeHome book={CS_BOOK} {...loaderData} />;
}
