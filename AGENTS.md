# PAIBOT.app

The app uses React Router Framework Mode with SSR on Cloudflare Workers.
Read `README.md` and `docs/plans/react-router-cutover.md` before changing deployment configuration.

- Source: `src/`; translations: `messages/`; static assets: `public/`.
- Routes: `src/routes.ts`. Public SEO pages also belong in `src/lib/seo.ts`.
- Runtime environment imports (`cloudflare:workers`) must stay server-only.
- Never print or commit `.dev.vars*`, `.env*`, generated builds, or credentials.
- Terraform owns infrastructure; Wrangler owns Worker code, bindings and routes.
- Run `npm run typecheck`, `npm run build`, `npm run e2e -- environments` for routing/server changes.
- Tests live in `tests/`: `npm test` runs every `tests/unit/*.test.mjs` (no build, server or browser; a new file joins automatically). `npm run e2e -- <name>` runs `tests/e2e/<name>.mjs` (build, preview, Clerk keys or local D1; see README). `scripts/` is tooling only.
- Every published tool in `src/lib/app-catalog.ts` is covered by `e2e -- catalog` (loads in ja/en/zh, no uncaught errors, fits 390px) with no test code; add a tool-specific flow to `tests/e2e/tools.mjs` and pure logic tests to `tests/unit/`.
- Work in a worktree (`git worktree add ../worktrees/<branch>` from `app/`); leave the `app/` checkout on `main` and untouched.
- Use a separate port for verification. Do not stop another person's dev server.
- Production deployment is manual. Keep rollback support for old vinext release refs.
