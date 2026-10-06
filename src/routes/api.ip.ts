import { requestInfo } from '../lib/ip-info';
import type { Route } from './+types/api.ip';

// The IP address page's details about the request that asks (see lib/ip-info.ts). Nothing is stored; no one else's request is shown.
export function loader({ request }: Route.LoaderArgs) {
  const cf = (request as Request & { cf?: Record<string, unknown> }).cf;
  return Response.json(requestInfo(request.headers, cf), { headers: { 'Cache-Control': 'private, no-store' } });
}
