import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
export default defineConfig({
  // The day of the build: the sitemap's <lastmod> (a page can only have changed in a new release).
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)) },
  plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), reactRouter()],
  // Small fonts (KaTeX's) would otherwise be inlined as data: URLs, which the
  // CSP's default-src 'self' blocks; emit them as same-origin files instead.
  build: { assetsInlineLimit: file => /\.(woff2?|ttf)$/.test(file) ? false : undefined },
});
