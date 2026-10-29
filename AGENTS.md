# PAIBOT.app

The app uses React Router Framework Mode with SSR on Cloudflare Workers.
Read `README.md` and `docs/plans/react-router-cutover.md` before changing deployment configuration.

- Source: `src/`; translations: `messages/`; static assets: `public/`.
- Routes: `src/routes.ts`. Public SEO pages also belong in `src/lib/seo.ts`.
- Runtime environment imports (`cloudflare:workers`) must stay server-only.
- Never print or commit `.dev.vars*`, `.env*`, generated builds, or credentials.
- Terraform owns infrastructure; Wrangler owns Worker code, bindings and routes.
- Run `npm run typecheck`, `npm run build`, `npm run e2e -- environments` for routing/server changes.
- Tests live in `tests/` and next to each tool: `npm test` runs every `tests/unit/*.test.mjs` and `src/tools/*/*.test.mjs` (no build, server or browser; a new file joins automatically). `npm run e2e -- <name>` runs `tests/e2e/<name>.mjs` (build, preview, Clerk keys or local D1; see README). `scripts/` is tooling only.
- A tool is a folder `src/tools/<slug>/` (route, components, logic, `*.test.mjs`, `e2e.mjs` flow) plus its catalog entry, icon and messages; see CLAUDE.md "Adding a tool". `e2e -- catalog` covers every published tool with no test code. `CHECK_TOOLS=slug,slug` limits `catalog`/`tools` to some tools.
- Work in a worktree (`git worktree add ../worktrees/<branch>` from `app/`); leave the `app/` checkout on `main` and untouched.
- Use a separate port for verification. Do not stop another person's dev server.
- Production deployment is manual, except the incident list update (`docs/breaches.md`, "Releasing"). Keep rollback support for old vinext release refs.
