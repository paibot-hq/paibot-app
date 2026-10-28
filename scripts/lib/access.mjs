// Access service tokens must never follow a redirect to Clerk or another origin.
export function accessHeaders() {
  const id = process.env.CF_ACCESS_CLIENT_ID;
  const secret = process.env.CF_ACCESS_CLIENT_SECRET;
  if (Boolean(id) !== Boolean(secret)) throw new Error('Both Cloudflare Access credentials are required');
  return id ? { 'CF-Access-Client-Id': id, 'CF-Access-Client-Secret': secret } : {};
}
// A connection the edge dropped (seen once in a deploy check, 2026-10-27) is tried again; a timeout or an HTTP
// error is not, and neither is a request that may change something.
const DROPPED = new Set(['ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'UND_ERR_SOCKET']);
const RETRY_WAITS = [1000, 3000];
async function fetchOnce(url, init) {
  const method = (init.method ?? 'GET').toUpperCase();
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, init);
    } catch (error) {
      const dropped = DROPPED.has(error?.cause?.code);
      if (!dropped || !['GET', 'HEAD'].includes(method) || attempt >= RETRY_WAITS.length) throw error;
      console.warn(`${url.pathname}: ${error.cause.code}, trying again`);
      await new Promise(resolve => setTimeout(resolve, RETRY_WAITS[attempt]));
    }
  }
}
export async function appFetch(base, path, options = {}) {
  let url = new URL(path, base);
  for (let n = 0; n < 10; n++) {
    if (url.origin !== new URL(base).origin) throw new Error('App request redirected outside its origin (check Access authentication)');
    const response = await fetchOnce(url, { ...options, signal: AbortSignal.timeout(20000), redirect: 'manual', headers: { ...options.headers, ...accessHeaders() } });
    if (options.redirect === 'manual' || ![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) return response;
    await response.body?.cancel();
    url = new URL(location, url);
  }
  throw new Error('Too many app redirects');
}
export async function configureAccess(page, base) {
  const headers = accessHeaders();
  if (!Object.keys(headers).length) return;
  // Playwright routing skips some redirect hops. Chromium's Fetch domain
  // intercepts each network hop; its header overrides apply only to that
  // request, so same-origin redirects keep Access and external ones do not.
  const session = await page.context().newCDPSession(page);
  await session.send('Fetch.enable', { patterns: [{ urlPattern: `${new URL(base).origin}/*`, requestStage: 'Request' }] });
  session.on('Fetch.requestPaused', async event => {
    try {
      const merged = { ...event.request.headers, ...headers };
      await session.send('Fetch.continueRequest', {
        requestId: event.requestId,
        headers: Object.entries(merged).map(([name, value]) => ({ name, value: String(value) })),
      });
    } catch (error) {
      if (!page.isClosed()) console.error('Access request interception failed:', error.message);
    }
  });
}
