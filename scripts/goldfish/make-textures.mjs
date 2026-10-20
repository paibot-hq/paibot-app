// Makes the goldfish bowl's fish textures (public/goldfish/*.webp), `npm run goldfish:textures`. Two steps:
//  1. The fish as the page builds them (src/tools/goldfish/fish-model.client.ts), each kind written as a glTF file: the
//     builder is bundled with esbuild and run in headless Chromium (three.js's exporter wants a browser), which hands
//     back the files.
//  2. Blender (scripts/goldfish/bake-textures.py) bakes the textures from each: scales, bumps, shade, fins, irises.
// Needs Blender: BLENDER=/path/to/blender, or the macOS app in /Applications. Run it after changing a fish's shape.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const blender = process.env.BLENDER ?? '/Applications/Blender.app/Contents/MacOS/Blender';
if (!existsSync(blender)) throw new Error(`Blender not found at ${blender} (set BLENDER)`);
const out = join(root, 'public/goldfish');
const work = mkdtempSync(join(tmpdir(), 'goldfish-'));
const KINDS = ['wakin', 'ryukin', 'demekin'];

try {
  // 1. The raw shapes.
  const entry = join(work, 'export.ts');
  writeFileSync(entry, `
    import * as THREE from "three";
    import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
    import { buildFish } from ${JSON.stringify(join(root, 'src/tools/goldfish/fish-model.client.ts'))};
    (async () => {
      const out = {};
      for (const kind of ${JSON.stringify(KINDS)}) {
        // Straight (no swimming pose), at the fish's own size of 1, with plain materials (only the meshes are wanted).
        const holder = buildFish(kind, 11);
        holder.traverse(o => { if (o.material) o.material = new THREE.MeshStandardMaterial({ vertexColors: !!o.geometry.getAttribute("color") }); });
        const glb = new Uint8Array(await new GLTFExporter().parseAsync(holder, { binary: true }));
        let text = ""; for (let i = 0; i < glb.length; i += 0x8000) text += String.fromCharCode(...glb.subarray(i, i + 0x8000));
        out[kind] = btoa(text);
      }
      window.result = out;
    })();
  `);
  await build({ entryPoints: [entry], bundle: true, format: 'iife', outfile: join(work, 'bundle.js'), logLevel: 'warning', alias: { three: join(root, 'node_modules/three') } });
  writeFileSync(join(work, 'index.html'), '<!doctype html><meta charset="utf-8"><script src="bundle.js"></script>');
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.goto(`file://${join(work, 'index.html')}`);
  await page.waitForFunction(() => window.result, undefined, { timeout: 60000 });
  const raw = await page.evaluate(() => window.result);
  await browser.close();

  // 2. The textures.
  for (const kind of KINDS) {
    const file = join(work, `${kind}.glb`);
    writeFileSync(file, Buffer.from(raw[kind], 'base64'));
    execFileSync(blender, ['-b', '--factory-startup', '--python', join(root, 'scripts/goldfish/bake-textures.py'), '--', kind, file, out, ...process.argv.slice(2)], { stdio: ['ignore', 'pipe', 'inherit'] })
      .toString().split('\n').filter(line => /^(SAVED|PREVIEW)/.test(line)).forEach(line => console.log(`${kind}: ${line}`));
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
