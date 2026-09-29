import { redirect } from 'react-router';
import type { Route } from './+types/math-redirect';

// Former math pages (entry pages by area and level, and each
// unit's set picker), folded into /math.
export function loader({ params }: Route.LoaderArgs) {
  return redirect(`/${params.locale}/math`, 301);
}
