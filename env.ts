import { defineEnv, string } from 'void/env';

// The values the Worker needs that are not in void.config.ts: secrets. Locally they come from .env (never committed,
// never deployed); a deployed Worker gets them with `void secret put <NAME>`, and `void deploy` stops if a required one is
// missing there. The app reads them from cloudflare:workers, as it does every binding.
export default defineEnv({
  // Clerk (sign-in). pk_test_/sk_test_ keys everywhere but production, which must have pk_live_/sk_live_.
  CLERK_PUBLISHABLE_KEY: string(),
  CLERK_SECRET_KEY: string(),
  // Optional, for trying the FAQ's search by meaning on your own computer (Workers AI by its REST address; never
  // deployed). A token that may use Workers AI.
  LOCAL_AI_ACCOUNT_ID: string().optional(),
  LOCAL_AI_TOKEN: string().optional(),
});
