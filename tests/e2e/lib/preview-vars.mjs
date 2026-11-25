import { readFileSync, writeFileSync } from 'node:fs';

// Plain-text variables of the built Worker for one run of `vite preview`, put back by the returned function. The preview
// reads the Worker's settings from Void's build output (.cloudflare/output), not build/server/wrangler.json, so the
// value is changed in both: the latter is what `wrangler dev --config build/server/...` reads.
const files = {
  output: '.cloudflare/output/v1/workers/default/worker.config.json',
  wrangler: 'build/server/wrangler.json',
};

export function overridePreviewVars(vars) {
  const originals = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, readFileSync(path, 'utf8')]));
  const output = JSON.parse(originals.output);
  const wrangler = JSON.parse(originals.wrangler);
  for (const [name, value] of Object.entries(vars)) {
    if (output.env?.[name]?.type !== 'text') throw new Error(`${name} is not a plain-text variable of the built Worker`);
    output.env[name] = { type: 'text', value };
    wrangler.vars[name] = value;
  }
  writeFileSync(files.output, JSON.stringify(output));
  writeFileSync(files.wrangler, JSON.stringify(wrangler));
  return () => {
    for (const [key, path] of Object.entries(files)) writeFileSync(path, originals[key]);
  };
}
