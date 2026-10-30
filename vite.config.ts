import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import { cloudflare } from '@cloudflare/vite-plugin';

// Python in the browser (src/tools/python): Pyodide's own files, served from this site at /pyodide/<version>/ rather than a CDN.
// The page's worker loads them at run time, so they are copied as they are, not bundled.
const pyodideDir = dirname(createRequire(import.meta.url).resolve('pyodide/package.json'));
const pyodideVersion: string = JSON.parse(readFileSync(join(pyodideDir, 'package.json'), 'utf8')).version;
const PYODIDE_FILES: Record<string, string> = {
  'pyodide.mjs': 'text/javascript',
  'pyodide.asm.mjs': 'text/javascript',
  'pyodide.asm.wasm': 'application/wasm',
  'python_stdlib.zip': 'application/zip',
  'pyodide-lock.json': 'application/json',
};
const pyodideFiles: Plugin[] = [
  {
    name: 'pyodide-files:serve',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(`/pyodide/${pyodideVersion}`, (req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\//, '');
        if (!(name in PYODIDE_FILES)) return next();
        res.setHeader('Content-Type', PYODIDE_FILES[name]);
        res.end(readFileSync(join(pyodideDir, name)));
      });
    },
  },
  {
    name: 'pyodide-files:build',
    apply: 'build',
    applyToEnvironment: environment => environment.name === 'client',
    generateBundle() {
      for (const name of Object.keys(PYODIDE_FILES)) this.emitFile({ type: 'asset', fileName: `pyodide/${pyodideVersion}/${name}`, source: readFileSync(join(pyodideDir, name)) });
    },
  },
];

export default defineConfig({
  // The day of the build: the sitemap's <lastmod> (a page can only have changed in a new release).
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)), __PYODIDE_VERSION__: JSON.stringify(pyodideVersion) },
  plugins: [
    ...pyodideFiles,
    // Local dev and preview never reach the real Workers AI (it is billed and needs a login): the tests stub the route's answers. REMOTE_BINDINGS=1 turns it on.
    cloudflare({ viteEnvironment: { name: 'ssr' }, remoteBindings: process.env.REMOTE_BINDINGS === '1' }),
    reactRouter(),
  ],
  // Small fonts (KaTeX's) would otherwise be inlined as data: URLs, which the
  // CSP's default-src 'self' blocks; emit them as same-origin files instead.
  build: { assetsInlineLimit: file => /\.(woff2?|ttf)$/.test(file) ? false : undefined },
});
