import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import { voidPlugin } from 'void';

// Python in the browser (src/tools/code-runner): Pyodide's own files, served from this site at /pyodide/<version>/ rather than a CDN.
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

// The AI chat (src/tools/browser-ai) runs ONNX Runtime, whose bundle points at its 27 MB wasm next to itself, more than
// a static asset may be (25 MiB). Transformers.js loads that wasm from jsDelivr instead, so the reference is made to point
// there too and the file is not copied into the build.
const ortVersion: string = JSON.parse(readFileSync(new URL('node_modules/onnxruntime-web/package.json', import.meta.url), 'utf8')).version;
const ortWasmFromCdn: Plugin = {
  name: 'ort-wasm-from-cdn',
  transform(code, id) {
    if (!id.includes('/onnxruntime-web/dist/')) return;
    return code.replace(/new URL\("(ort-wasm[\w.-]*\.wasm)",\s*import\.meta\.url\)/g, (_, file) => `new URL("https://cdn.jsdelivr.net/npm/onnxruntime-web@${ortVersion}/dist/${file}")`);
  },
};
export default defineConfig({
  optimizeDeps: { exclude: ["@electric-sql/pglite"] },
  // The day of the build: the sitemap's <lastmod> (a page can only have changed in a new release).
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)), __PYODIDE_VERSION__: JSON.stringify(pyodideVersion) },
  plugins: [
    ...pyodideFiles,
    // Builds the Worker, runs it locally and deploys it (void.config.ts). Before the framework plugin, as Void requires.
    // Local data stays in .wrangler/state, where the tests and the import scripts (wrangler d1 ... --local) find it.
    voidPlugin({ persistTo: '.wrangler/state' }),
    reactRouter(),
  ],
  // ES modules, so the worker can import each engine only when it is used.
  worker: { format: 'es', plugins: () => [ortWasmFromCdn] },
  // Small fonts (KaTeX's) would otherwise be inlined as data: URLs, which the
  // CSP's default-src 'self' blocks; emit them as same-origin files instead.
  build: { assetsInlineLimit: file => /\.(woff2?|ttf)$/.test(file) ? false : undefined },
});
