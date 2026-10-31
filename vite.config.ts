import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import { cloudflare } from '@cloudflare/vite-plugin';

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
  // The day of the build: the sitemap's <lastmod> (a page can only have changed in a new release).
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)) },
  plugins: [
    // Local dev and preview never reach the real Workers AI (it is billed and needs a login): the tests stub the route's answers. REMOTE_BINDINGS=1 turns it on.
    cloudflare({ viteEnvironment: { name: 'ssr' }, remoteBindings: process.env.REMOTE_BINDINGS === '1' }),
    reactRouter(),
  ],
  worker: { plugins: () => [ortWasmFromCdn] },
  // Small fonts (KaTeX's) would otherwise be inlined as data: URLs, which the
  // CSP's default-src 'self' blocks; emit them as same-origin files instead.
  build: { assetsInlineLimit: file => /\.(woff2?|ttf)$/.test(file) ? false : undefined },
});
