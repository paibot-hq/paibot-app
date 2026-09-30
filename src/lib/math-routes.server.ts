import { findUnit } from './math-catalog';

// The catalog entries a /math/<unit>/<item>[/<set>] URL names, or a 404.
export function catalogEntry(params: { unit?: string; item?: string; set?: string }) {
  const unit = findUnit(params.unit ?? '');
  const item = unit?.items.find(entry => entry.id === params.item);
  const set = params.set === undefined ? undefined : item?.sets.find(entry => entry.id === params.set);
  if (!unit || !item || (params.set !== undefined && !set)) throw new Response('Not Found', { status: 404 });
  return { unit, item, set };
}
