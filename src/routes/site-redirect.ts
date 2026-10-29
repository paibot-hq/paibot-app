import { redirect } from 'react-router';
import type { Route } from './+types/site-redirect';

// The former category pages (daily, game, utility, study, developer and network): every app is searched from the top page
// or listed on /apps now, so each of those addresses goes to the top page.
export function loader({ params }: Route.LoaderArgs) {
  return redirect(`/${params.locale}`, 301);
}
