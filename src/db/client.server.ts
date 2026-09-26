import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// Resolve the binding inside the caller's error boundary, including environments
// where D1 has not been provisioned yet.
export function getDb() {
  return drizzle(env.DB, { schema });
}
