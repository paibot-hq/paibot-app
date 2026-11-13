import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const readJSON = file => existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
const writeJSON = (file, value) => {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, file);
};

// A failed, interrupted or quota-limited attempt leaves the published lesson intact.
// Drafts persist across runs, including the review feedback needed to resume a fix.
export function lessonStore(publishedFile, draftsFile, compare) {
  return {
    published: () => readJSON(publishedFile),
    draft: key => readJSON(draftsFile)[key],
    stage(key, lesson, feedback = '') {
      const drafts = readJSON(draftsFile);
      const { reviewedAt, ...body } = lesson;
      drafts[key] = { lesson: body, feedback, updatedAt: new Date().toISOString() };
      writeJSON(draftsFile, drafts);
    },
    publish(key, lesson, reviewedAt) {
      const lessons = readJSON(publishedFile);
      lessons[key] = { ...lesson, reviewedAt };
      const entries = Object.entries(lessons);
      if (compare) entries.sort(([a], [b]) => compare(a, b));
      writeJSON(publishedFile, Object.fromEntries(entries));
      const drafts = readJSON(draftsFile);
      delete drafts[key];
      writeJSON(draftsFile, drafts);
    },
  };
}
