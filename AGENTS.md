# PAIBOT.app

The app uses React Router Framework Mode with SSR on Cloudflare Workers.
Read `README.md` and `docs/plans/react-router-cutover.md` before changing deployment configuration.

- Source: `src/`; translations: `messages/`; static assets: `public/`.
- Routes: `src/routes.ts`. Public SEO pages also belong in `src/lib/seo.ts`.
- Runtime environment imports (`cloudflare:workers`) must stay server-only.
- Never print or commit `.dev.vars*`, `.env*`, generated builds, or credentials.
- Terraform owns infrastructure; Wrangler owns Worker code, bindings and routes.
- Run `npm run typecheck`, `npm run build`, `npm run check:environments` for routing/server changes.
- `npm run check:all` runs every check that needs no build, server or browser; a new `scripts/check-*.mjs` joins it automatically unless its first line is `// check:all skips this file: <reason>`.
- Browser checks: `check:smoke` and `check:tools` against a running preview.
- Work in a worktree (`git worktree add ../worktrees/<branch>` from `app/`); leave the `app/` checkout on `main` and untouched.
- Use a separate port for verification. Do not stop another person's dev server.
- Production deployment is manual. Keep rollback support for old vinext release refs.
