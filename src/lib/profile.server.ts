import { eq } from 'drizzle-orm';
import { getDb } from '../db/client.server';
import { userProfiles } from '../db/schema';
import { isLocale, type Locale } from '../i18n/routing';

export type Theme = 'light' | 'dark';
export type Profile = { birthDate: string | null; locale: Locale | null; theme: Theme | null };

const empty: Profile = { birthDate: null, locale: null, theme: null };

export async function getProfile(userId: string): Promise<Profile> {
  const rows = await getDb().select({ birthDate: userProfiles.birthDate, locale: userProfiles.locale, theme: userProfiles.theme })
    .from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1).all();
  const row = rows[0];
  if (!row) return empty;
  return {
    birthDate: row.birthDate,
    // Values written by an older or newer build must not widen these types.
    locale: isLocale(row.locale ?? undefined) ? row.locale as Locale : null,
    theme: row.theme === 'light' || row.theme === 'dark' ? row.theme : null,
  };
}

// One write path for all three fields: only the keys passed are touched, so
// saving a theme never disturbs a stored birth date.
export async function saveProfile(userId: string, fields: Partial<Profile>) {
  const updatedAt = new Date().toISOString();
  await getDb().insert(userProfiles).values({ userId, ...fields, updatedAt })
    .onConflictDoUpdate({ target: userProfiles.userId, set: { ...fields, updatedAt } }).run();
}
