import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { lessonStore } from '../../scripts/lib/math-lesson-store.mjs';

test('unfinished revisions survive a restart without hiding or replacing reviewed lessons', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lesson-store-'));
  try {
    const published = join(dir, 'lessons.json');
    const drafts = join(dir, 'work/drafts.json');
    const original = { sections: ['original'], reviewedAt: '2026-11-01' };
    writeFileSync(published, JSON.stringify({ a: original }));
    let store = lessonStore(published, drafts);
    store.stage('a', { sections: ['revision'], reviewedAt: '2026-11-01' }, 'fix the coefficient');
    store.stage('new', { sections: ['new lesson'] });
    // Resume after the writer/reviewer failed or the process was terminated.
    store = lessonStore(published, drafts);
    assert.deepEqual(store.published(), { a: original });
    assert.deepEqual(store.draft('a').lesson, { sections: ['revision'] });
    assert.equal(store.draft('a').feedback, 'fix the coefficient');
    assert.equal(store.published().new, undefined);
    store.publish('a', store.draft('a').lesson, '2026-11-03');
    assert.deepEqual(JSON.parse(readFileSync(published)), {
      a: { sections: ['revision'], reviewedAt: '2026-11-03' },
    });
    assert.equal(store.draft('a'), undefined);
    assert.deepEqual(store.draft('new').lesson, { sections: ['new lesson'] });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
