import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
export default defineConfig({
  plugins: [
    // Local dev and preview never reach the real Workers AI (it is billed and needs a login): the tests stub the route's answers. REMOTE_BINDINGS=1 turns it on.
    cloudflare({ viteEnvironment: { name: 'ssr' }, remoteBindings: process.env.REMOTE_BINDINGS === '1' }),
    reactRouter(),
  ],
  // Small fonts (KaTeX's) would otherwise be inlined as data: URLs, which the
  // CSP's default-src 'self' blocks; emit them as same-origin files instead.
  build: { assetsInlineLimit: file => /\.(woff2?|ttf)$/.test(file) ? false : undefined },
});
