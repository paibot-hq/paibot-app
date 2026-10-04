import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jobsNeeded } from '../../scripts/lib/ci-jobs.mjs';

test('anything that can reach every tool runs both jobs', () => {
  assert.deepEqual(jobsNeeded({ affected: 'all', files: ['workers/app.ts'] }), { e2e: true, browser: true });
});

test('an ordinary tool or the math drills skip the server checks but still run the browser', () => {
  assert.deepEqual(jobsNeeded({ affected: 'json', files: ['src/tools/json/route.tsx'] }), { e2e: false, browser: true });
  assert.deepEqual(jobsNeeded({ affected: 'math', files: ['src/data/math-arith.json'] }), { e2e: false, browser: true });
});

test('the tools whose flows start their own server run the server checks', () => {
  assert.deepEqual(jobsNeeded({ affected: 'json,domain', files: [] }), { e2e: true, browser: true });
  assert.deepEqual(jobsNeeded({ affected: 'site-check', files: [] }), { e2e: true, browser: true });
});

test('a change nothing in a browser can see skips both', () => {
  assert.deepEqual(jobsNeeded({ affected: '', files: ['tests/unit/sites.test.mjs'] }), { e2e: false, browser: false });
});

test('a library the checks import runs both even though affected-tools calls it tooling', () => {
  assert.deepEqual(jobsNeeded({ affected: '', files: ['scripts/lib/access.mjs'] }), { e2e: true, browser: true });
  assert.deepEqual(jobsNeeded({ affected: '', files: ['scripts/validate-math-arith.mjs'] }), { e2e: true, browser: true });
});

test('a pipeline script that no check imports skips both', () => {
  assert.deepEqual(jobsNeeded({ affected: '', files: ['scripts/math-pipeline.mjs'] }), { e2e: false, browser: false });
});
