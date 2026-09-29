import { redirect } from 'react-router';
import type { Route } from './+types/math-redirect';

// Former math entry pages (by unit, level, Suken grade), folded into /math.
export function loader({ params }: Route.LoaderArgs) {
  return redirect(`/${params.locale}/math`, 301);
}
