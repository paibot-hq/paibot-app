import { redirect } from 'react-router';
import type { Route } from './+types/math-redirect';

// Former math entry pages (by area and level), folded into /math.
export function loader({ params }: Route.LoaderArgs) {
  return redirect(`/${params.locale}/math`, 301);
}
