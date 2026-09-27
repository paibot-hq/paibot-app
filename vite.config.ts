import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
export default defineConfig({
  plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), reactRouter()],
  // Small fonts (KaTeX's) would otherwise be inlined as data: URLs, which the
  // CSP's default-src 'self' blocks; emit them as same-origin files instead.
  build: { assetsInlineLimit: file => /\.(woff2?|ttf)$/.test(file) ? false : undefined },
});
