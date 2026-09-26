import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client.server";
import { favorites } from "../db/schema";
import { apps } from "./apps";

// Server-only: reads the D1 binding. Only import this from a route
// loader/action — never from component code, or "cloudflare:workers" fails
// to resolve in the client build. See src/lib/seo.server.ts for the same
// convention.

const FAVORITABLE_SLUGS = new Set(apps.filter(app => app.status === "published").map(app => app.slug));

// A comingSoon app (including /math) has nothing real to favorite yet; the
// UI gates the star button on the same condition (see AppCard's canFavorite).
export function isFavoritableSlug(slug: string): boolean {
  return FAVORITABLE_SLUGS.has(slug);
}

export type FavoritesResult =
  | { status: "ok"; slugs: string[] }
  | { status: "error"; reason: "d1_error" };

export async function listFavorites(userId: string): Promise<FavoritesResult> {
  try {
    const rows = await getDb().select({ appSlug: favorites.appSlug }).from(favorites)
      .where(eq(favorites.userId, userId)).all();
    return { status: "ok", slugs: rows.map(row => row.appSlug) };
  } catch (error) {
    console.error("favorites: listFavorites failed", error);
    return { status: "error", reason: "d1_error" };
  }
}

export type FavoriteWriteResult =
  | { status: "ok"; favorited: boolean }
  | { status: "error"; reason: "invalid_slug" | "d1_error" };

// Two idempotent operations instead of one stateful "toggle": the client
// already knows which state it's in and tells the server which one it wants
// (see the route action), so there's no read-then-write race between two
// rapid/concurrent requests for the same (user_id, app_slug).
export async function addFavorite(userId: string, appSlug: string): Promise<FavoriteWriteResult> {
  if (!isFavoritableSlug(appSlug)) return { status: "error", reason: "invalid_slug" };
  try {
    await getDb().insert(favorites).values({ userId, appSlug })
      .onConflictDoNothing({ target: [favorites.userId, favorites.appSlug] })
      .run();
    return { status: "ok", favorited: true };
  } catch (error) {
    console.error("favorites: addFavorite failed", error);
    return { status: "error", reason: "d1_error" };
  }
}

export async function removeFavorite(userId: string, appSlug: string): Promise<FavoriteWriteResult> {
  if (!isFavoritableSlug(appSlug)) return { status: "error", reason: "invalid_slug" };
  try {
    await getDb().delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.appSlug, appSlug)))
      .run();
    return { status: "ok", favorited: false };
  } catch (error) {
    console.error("favorites: removeFavorite failed", error);
    return { status: "error", reason: "d1_error" };
  }
}
