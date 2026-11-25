// Reports this document load to routes/api.view.ts, which counts it for the tool ranking when it entered the site
// from outside (src/lib/tool-ranking.ts). Called once per document load after hydration (src/root.tsx), never on the
// client router's navigations: an entrance only happens when the browser loads a document. Counting from this beacon
// instead of the page request keeps out crawlers that wear a browser's User-Agent but never run scripts; people who
// browse with scripts off are missed, which the ranking accepts (they are not hydrated either).
let sent = false;
export function reportEntrance() {
  try {
    // Once per document load, whatever remounts the component (React StrictMode runs effects twice in development).
    if (sent) return;
    sent = true;
    if (typeof document === 'undefined' || typeof navigator.sendBeacon !== 'function') return;
    const body = JSON.stringify({ path: location.pathname, referrer: document.referrer });
    navigator.sendBeacon('/api/view', new Blob([body], { type: 'application/json' }));
  } catch {
    // A blocked or failed beacon only loses this one view.
  }
}
