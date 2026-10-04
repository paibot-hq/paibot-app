import { redirect } from 'react-router';
import type { Route } from './+types/site-redirect';

// The former list and category pages (and the study, developer and network ones): everything is searched from the top
// page now, so each of those addresses goes there.
export function loader({ params }: Route.LoaderArgs) {
  return redirect(`/${params.locale}`, 301);
}
