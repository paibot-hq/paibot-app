import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ENGLISH_CATALOG, ENGLISH_UNITS, findEnglishItem } from '../src/tools/english/catalog.ts';
import { audioHash, audioPath } from './english-voice.mjs';

// English practice's problem banks (src/data/english-<unit>.json) and the checks every problem must pass before it is imported.
// There is no machine check of the answer (math re-derives its answers with SymPy); that is the blind review's job
// (scripts/english-review.mjs), and a problem is published only when both reviewers agreed with it (docs/plans/english-practice.md).
export const MAX_SET_PROBLEMS = 50;
export const REVIEWERS = ['codex', 'agy'];
export const bankPath = unit => new URL(`../src/data/english-${unit}.json`, import.meta.url);
export const banks = Object.fromEntries(ENGLISH_UNITS.map(unit => [unit, JSON.parse(readFileSync(bankPath(unit), 'utf8'))]));

const normalize = text => text.trim().toLowerCase().replace(/\s+/g, ' ');

// Both reviewers chose the key, found no other choice that also works, and raised nothing.
export const reviewPassed = problem => REVIEWERS.every(reviewer => problem.review?.[reviewer]?.ok === true);

export function validateBank(unit, bank) {
  const ids = new Set();
  const positions = new Map();
  for (const p of bank.problems) {
    const at = `${unit} ${p.id}`;
    assert.match(p.id, new RegExp(`^${unit}-\\d{3}$`), `${at}: id`);
    assert.ok(!ids.has(p.id), `${at}: duplicate id`);
    ids.add(p.id);
    const item = findEnglishItem(unit, p.item);
    assert.ok(item, `${at}: no item ${p.item} in ${unit}`);
    assert.ok(item.sets.some(set => set.id === p.setId), `${at}: no set ${p.setId} in ${p.item}`);
    const key = `${p.item}/${p.setId}`;
    if (!positions.has(key)) positions.set(key, []);
    positions.get(key).push(p.position);
    assert.ok([1, 2, 3].includes(p.tier), `${at}: tier`);
    assert.equal(typeof p.published, 'boolean', `${at}: published`);
    assert.equal(typeof p.reviewedAt, 'string', `${at}: reviewedAt`);
    assert.equal(typeof p.stem, 'string', `${at}: stem`);
    assert.equal(p.stem.split('___').length - 1, 1, `${at}: the stem has exactly one blank (___)`);
    assert.ok(p.stem.length <= 200, `${at}: stem too long`);
    assert.ok(Array.isArray(p.choices) && p.choices.length === 4, `${at}: four choices`);
    assert.ok(p.choices.every(choice => typeof choice === 'string' && choice.trim() && choice.length <= 40), `${at}: choices`);
    assert.equal(new Set(p.choices.map(normalize)).size, 4, `${at}: the choices differ`);
    assert.ok(Number.isInteger(p.answerIndex) && p.answerIndex >= 0 && p.answerIndex < 4, `${at}: answerIndex`);
    assert.ok(typeof p.explanation?.ja === 'string' && p.explanation.ja.trim() && p.explanation.ja.length <= 300, `${at}: explanation.ja`);
    assert.ok(typeof p.point?.ja === 'string' && p.point.ja.trim() && p.point.ja.length <= 40, `${at}: point.ja`);
    assert.ok(typeof p.translation?.ja === 'string' && p.translation.ja.trim() && p.translation.ja.length <= 200, `${at}: translation.ja`);
    // The recording (scripts/english-audio.mjs) must be of the sentence as it is now, in the current voice.
    if (p.audio !== undefined) {
      assert.equal(p.audio, audioHash(p), `${at}: the recording is of another sentence or voice (npm run english:audio)`);
      assert.ok(existsSync(audioPath(p.id)), `${at}: no recording at public/english-audio/${p.id}.mp3 (npm run english:audio)`);
    }
    if (p.published) {
      assert.ok(reviewPassed(p), `${at}: published without both reviews passing`);
      assert.ok(p.audio, `${at}: published without a recording (npm run english:audio)`);
    }
  }
  for (const [key, list] of positions) {
    assert.ok(list.length <= MAX_SET_PROBLEMS, `${unit} ${key}: at most ${MAX_SET_PROBLEMS} problems`);
    assert.deepEqual([...list].sort((a, b) => a - b), list.map((_, index) => index + 1).sort((a, b) => a - b), `${unit} ${key}: positions are 1..n`);
    const answers = bank.problems.filter(p => `${p.item}/${p.setId}` === key).map(p => p.answerIndex);
    if (answers.length >= 4) assert.ok(new Set(answers).size >= 3, `${unit} ${key}: the right answers are spread over the choices`);
  }
}

export function validateAll() {
  for (const unit of ENGLISH_UNITS) validateBank(unit, banks[unit]);
  return Object.values(banks).reduce((sum, bank) => sum + bank.problems.length, 0);
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(`${validateAll()} English problems OK (${Object.keys(ENGLISH_CATALOG).join(', ')})`);
