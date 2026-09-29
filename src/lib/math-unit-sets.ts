import { ARITH_SETS } from './math-arith-sets';
import type { MathCatalogUnit } from './math-catalog';
import { FACTORIZATION_SETS } from './math-factorization-sets';
import { PYTHAGORAS_SETS } from './math-pythagoras-sets';
import { SIGNED_SETS } from './math-signed-sets';

// Every unit's sets in display order, with the key of each set's name under
// App.math: published units keep their sets (and names) in their own
// math-*-sets.ts files, coming-soon units in the catalog.
const PUBLISHED_SETS: Record<string, readonly { id: string; labelKey: string }[]> = {
  arith: ARITH_SETS, signed: SIGNED_SETS, factorization: FACTORIZATION_SETS, pythagoras: PYTHAGORAS_SETS,
};

export type UnitSet = { id: string; labelKey: string };

export function unitSets(unit: MathCatalogUnit): UnitSet[] {
  const published = PUBLISHED_SETS[unit.id];
  return published
    ? published.map(set => ({ id: set.id, labelKey: `${unit.id}.${set.labelKey}` }))
    : unit.sets.map(set => ({ id: set.id, labelKey: `units.${unit.id}.sets.${set.id}` }));
}
