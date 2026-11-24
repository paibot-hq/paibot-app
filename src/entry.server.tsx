import type { EntryContext, RouterContextProvider } from "react-router";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import { NonceContext } from "./lib/csp-nonce";
import { buildContentSecurityPolicy } from "./lib/security-headers.server";

// React Router's own entry for the web (@react-router/dev's entry.server.web.tsx), plus a nonce for the page's
// scripts: a new one for every page, given to React Router (<Scripts>, <ScrollRestoration>, its data), to React (its
// streaming scripts), to the page's own scripts (root.tsx) and to the Content-Security-Policy that allows them
// (workers/app.ts keeps it, and gives every other response the one without a nonce).
export const streamTimeout = 5_000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: RouterContextProvider,
) {
  // https://httpwg.org/specs/rfc9110.html#HEAD
  if (request.method.toUpperCase() === "HEAD") {
    responseHeaders.set("Content-Type", "text/html");
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  }

  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  let shellRendered = false;
  let userAgent = request.headers.get("user-agent");

  const body = await renderToReadableStream(
    <NonceContext value={nonce}><ServerRouter context={routerContext} url={request.url} nonce={nonce} /></NonceContext>,
    {
      nonce,
      signal: AbortSignal.timeout(streamTimeout + 1000),
      onError(error: unknown) {
        responseStatusCode = 500;
        // Log streaming rendering errors from inside the shell. Don't log
        // errors encountered during initial shell rendering since they'll
        // reject and get logged in handleDocumentRequest.
        if (shellRendered) {
          console.error(error);
        }
      },
    },
  );
  shellRendered = true;

  // Ensure requests from bots and SPA Mode renders wait for all content to load before responding
  // https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
  if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html");
  responseHeaders.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
