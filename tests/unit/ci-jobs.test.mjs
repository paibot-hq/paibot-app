import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jobsNeeded } from '../../scripts/lib/ci-jobs.mjs';

test('anything that can reach every tool runs both jobs', () => {
  assert.deepEqual(jobsNeeded({ affected: 'all', files: ['workers/app.ts'] }), { e2e: true, browser: true, sympy: false });
});

test('an ordinary tool or the math drills skip the server checks but still run the browser', () => {
  assert.deepEqual(jobsNeeded({ affected: 'json', files: ['src/tools/json/route.tsx'] }), { e2e: false, browser: true, sympy: false });
  assert.deepEqual(jobsNeeded({ affected: 'math', files: ['src/data/math-arith.json'] }), { e2e: false, browser: true, sympy: true });
});

test('the tools whose flows start their own server run the server checks', () => {
  assert.deepEqual(jobsNeeded({ affected: 'json,domain', files: [] }), { e2e: true, browser: true, sympy: false });
  assert.deepEqual(jobsNeeded({ affected: 'site-check', files: [] }), { e2e: true, browser: true, sympy: false });
});

test('a change nothing in a browser can see skips both', () => {
  assert.deepEqual(jobsNeeded({ affected: '', files: ['tests/unit/sites.test.mjs'] }), { e2e: false, browser: false, sympy: false });
});

test('a library the checks import runs both even though affected-tools calls it tooling', () => {
  assert.deepEqual(jobsNeeded({ affected: '', files: ['scripts/lib/access.mjs'] }), { e2e: true, browser: true, sympy: false });
  assert.deepEqual(jobsNeeded({ affected: '', files: ['scripts/validate-math-arith.mjs'] }), { e2e: true, browser: true, sympy: false });
  assert.deepEqual(jobsNeeded({ affected: '', files: ['scripts/import-breaches.mjs'] }), { e2e: true, browser: true, sympy: false });
});

test('a pipeline script that no check imports skips both', () => {
  assert.deepEqual(jobsNeeded({ affected: '', files: ['scripts/math-pipeline.mjs'] }), { e2e: false, browser: false, sympy: false });
});

test('SymPy runs only for what it reads: the banks, the verifier and its Python setup (and this workflow)', () => {
  for (const file of ['src/data/math-arith.json', 'scripts/verify_math.py', 'uv.lock', '.github/workflows/app.yml']) {
    assert.equal(jobsNeeded({ affected: '', files: [file] }).sympy, true, file);
  }
  for (const file of ['src/data/quiz.json', 'src/lib/math-formula.ts', 'scripts/math-pipeline.mjs']) {
    assert.equal(jobsNeeded({ affected: 'all', files: [file] }).sympy, false, file);
  }
});
