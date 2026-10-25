import { eq } from 'drizzle-orm';
import { getDb } from '../../db/client.server';
import { englishProblems } from '../../db/schema';

// "unit/item/set" of every set with published problems, i.e. every set a visitor can play; the rest are shown as
// being prepared. Empty when the database cannot be read: the pages work without it.
export async function getPlayableEnglishSets(): Promise<string[]> {
  try {
    const t = englishProblems;
    const rows = await getDb().selectDistinct({ unit: t.unit, item: t.item, setId: t.setId }).from(t).where(eq(t.published, true));
    return rows.map(row => `${row.unit}/${row.item}/${row.setId}`);
  } catch {
    return [];
  }
}
