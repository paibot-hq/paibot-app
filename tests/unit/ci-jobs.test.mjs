import { test } from 'node:test';
import assert from 'node:assert/strict';
import { browserScope, jobsNeeded } from '../../scripts/lib/ci-jobs.mjs';

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

test('shared code: every tool gets the shared checks, but only the named tools run their own flows', () => {
  assert.deepEqual(browserScope({ affected: 'all', files: ['src/components/search-home.tsx', 'messages/ja.json'] }), { catalog: 'all', flows: '' });
});

test('a change to the checks, the CI or the dependencies runs every flow', () => {
  for (const file of ['tests/e2e/tools.mjs', 'tests/e2e/lib/selected-tools.mjs', '.github/workflows/app.yml', 'scripts/ci-changes.mjs', 'scripts/lib/ci-jobs.mjs', 'package-lock.json']) {
    assert.deepEqual(browserScope({ affected: 'all', files: ['src/lib/apps.tsx', file] }), { catalog: 'all', flows: 'all' }, file);
  }
  assert.deepEqual(browserScope({ affected: '', files: ['scripts/import-math.mjs'] }), { catalog: 'all', flows: 'all' }, 'a library the checks import');
});

test('a change that names tools checks just those, both ways; one that reaches none checks nothing', () => {
  assert.deepEqual(browserScope({ affected: 'json,math', files: ['src/tools/json/route.tsx', 'tests/e2e/flows/math.mjs'] }), { catalog: 'json,math', flows: 'json,math' });
  assert.deepEqual(browserScope({ affected: '', files: ['docs/plans/x.md'] }), { catalog: '', flows: '' });
});
