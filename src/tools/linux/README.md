# Linux terminal

`/linux` boots v86 in a dedicated module Worker after the visitor presses Start.
The client loads xterm.js only then. Stop/Reset/unmount terminates the worker,
including a guest stuck in a busy loop. Every boot starts with a clean in-memory
filesystem; two sample files are created in `/root/practice`. No network backend
is passed to v86. No user commands or files are sent to an execution server.

The npm dependencies (`v86`, `@xterm/xterm`) are pinned. The wasm is bundled as a
same-origin Vite asset. BIOS and kernel are fetched directly from upstream with
SHA-256 integrity, a 60-second download timeout, and no Referer. The overall boot
has a 90-second timeout. See `public/linux/NOTICE.md` for URLs/provenance. Boot
requires those hosts to be available; failure is visible and can be retried. The
initial download is approximately 12 MB. Nothing boots during SSR or catalog
browsing, and there is no persistent session storage.

Verification after a production build and starting a preview on a free port:

```
CHECK_BROWSER_BASE_URL=http://localhost:3321 CHECK_TOOLS=linux npm run e2e -- tools catalog
```

The flow boots the actual Linux image, verifies command output, sample files,
pipes, reset/cancel, interruption of a busy guest, Stop, a failed download and
retry. It runs alone so CPU emulation does not compete with other tool flows.
Catalog checks cover the three locales and narrow screens. External boot image
requests must be allowed in the test environment.
