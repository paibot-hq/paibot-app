---
name: preview
description: Start the site locally so the user can look at it ("ローカルで開いて", "プレビューして", "動かして", "起動して"). Picks the dev server or a built preview, checks it answers, gives the link, and stops only what it started. Use before showing any page, tool or change in the browser.
---

# Preview the site locally

Run everything from the worktree you are in (never the `app/` checkout). Use a port that is not another person's: do not stop a server you did not start.

## Pick the server

| Wanted | Command | Port |
| --- | --- | --- |
| Look at a page while editing (default) | `npm run dev` (React Router dev server, hot reload) | 3002 |
| What will be deployed (built Worker), or before e2e | `npm run build` then `npx vite preview --port 3012` | 3012 |

- If something already answers on the port, reuse it (`curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>/ja`). A dev server needs no rebuild after an edit.
- A preview serves the build it was started from: after editing, rebuild, stop the preview **you** started (`pkill -f "vite preview --port 3012"`) and start it again.
- Start servers in the background (`run_in_background`), then wait until `curl` gives 200 on the page you will link (poll a few times; do not `sleep` for long).

## Give the link

Reply in Japanese with a Markdown link, never a bare URL: `[行政FAQ検索](http://localhost:3012/ja/govfaq)`. Say which branch and commit it shows (`git branch --show-current`, `git log --oneline -1`) and what in the page to look at. End by asking to be told when they are done, so you can stop it.

## Things to know

- Pages: `/ja`, `/en`, `/zh` + the tool's path (`src/lib/app-catalog.ts`).
- The government FAQ's search by meaning and answers call Workers AI. On a computer the binding is turned away by Cloudflare Access, so it uses the REST address when `LOCAL_AI_ACCOUNT_ID` and `LOCAL_AI_TOKEN` are in `.dev.vars` (see `.dev.vars.example`). Check only that both lines exist (`grep -c "^LOCAL_AI_" .dev.vars`); never print or read the values. If they are missing, tell the user to add them in their own editor; without them the page still works with the search by words.
- A browser check needs a running preview (`CHECK_BROWSER_BASE_URL=http://localhost:3012 npm run e2e -- <name>`), see `README.md`.
- To look at a page yourself, take a screenshot with Playwright (`node_modules/playwright`), wait for hydration (`document.documentElement.dataset.theme`), and read the image.
- Stop what you started when the user says they are done: `pkill -f "vite preview --port 3012"`, or stop the dev server you started.
