import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ARITH_SETS } from '../src/lib/math-arith-sets.ts';
import { SIGNED_SETS } from '../src/lib/math-signed-sets.ts';
import { PYTHAGORAS_SETS } from '../src/lib/math-pythagoras-sets.ts';
import { FACTORIZATION_SETS } from '../src/lib/math-factorization-sets.ts';
import { EXPRESSION_UNITS, expressionUnitSets } from '../src/lib/math-expression-units.ts';
import { FORMULA_UNITS, formulaUnitSets, isFormulaUnit } from '../src/lib/math-formula-units.ts';
import { expressionTex, solutionTex, statementTex, unknownOf } from '../src/lib/math-formula.ts';

export const root = fileURLToPath(new URL('../', import.meta.url));
export function context(unit, setId) {
  const catalogs = { arith: ARITH_SETS, signed: SIGNED_SETS, factorization: FACTORIZATION_SETS, pythagoras: PYTHAGORAS_SETS,
    ...Object.fromEntries(EXPRESSION_UNITS.map(unit => [unit, expressionUnitSets(unit)])),
    ...Object.fromEntries(FORMULA_UNITS.map(unit => [unit, formulaUnitSets(unit)])) };
  assert.ok(Object.hasOwn(catalogs, unit), `Unknown unit: ${unit}`);
  const catalog = catalogs[unit];
  const set = catalog.find(set => set.id === setId);
  if (setId !== undefined) assert.ok(set, `Unknown set: ${setId}`);
  const path = `${root}src/data/math-${unit}.json`;
  const original = readFileSync(path, 'utf8');
  return { catalog, set, path, original, bank: JSON.parse(original) };
}
export const promptFile = name => readFileSync(new URL(`./math-prompts/${name}.md`, import.meta.url), 'utf8');

// Scan complete objects, respecting braces inside JSON strings and fenced output.
export function extractJSON(raw, key) {
  for (let start = 0; start < raw.length; start++) {
    if (raw[start] !== '{') continue;
    let depth = 0, quoted = false, escaped = false;
    for (let end = start; end < raw.length; end++) {
      const c = raw[end];
      if (quoted) {
        if (escaped) escaped = false;
        else if (c === '\\') escaped = true;
        else if (c === '"') quoted = false;
      } else if (c === '"') quoted = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) {
        try {
          const result = JSON.parse(raw.slice(start, end + 1));
          if (Array.isArray(result[key])) return result;
        } catch { /* Continue past non-JSON preamble. */ }
        break;
      }
    }
  }
  throw new Error(`No JSON object containing ${key} found`);
}
export function additions(unit, setId, bank, generated, count, date = new Date().toISOString().slice(0, 10)) {
  assert.equal(generated.problems.length, count, `Expected ${count} problems`);
  const maxId = Math.max(0, ...bank.problems.map(p => {
    const match = p.id.match(new RegExp(`^${unit}-(\\d+)$`));
    assert.ok(match, `Unexpected existing ID: ${p.id}`);
    return Number(match[1]);
  }));
  const maxPosition = Math.max(0, ...bank.problems.filter(p => p.setId === setId).map(p => p.position));
  return generated.problems.map((p, index) => ({
    id: `${unit}-${String(maxId + index + 1).padStart(3, '0')}`, setId,
    position: maxPosition + index + 1, published: false, reviewedAt: date,
    ...(unit === 'pythagoras' ? { figure: p.figure } : unit === 'factorization' ? { p: p.p, q: p.q }
      : isFormulaUnit(unit) ? { kind: p.kind, question: p.question, given: p.given ?? null } : { expression: p.expression, word: p.word }),
    choices: p.choices, answerIndex: p.answerIndex,
  }));
}
export function formatBank(bank) {
  return JSON.stringify(bank, null, 2).replace(/"choices": \[[\s\S]*?\n      \]/g,
    text => `"choices": ${JSON.stringify(JSON.parse(text.slice(text.indexOf('[')))).replaceAll(',', ', ')}`) + '\n';
}
export function saveWork(prefix, content, extension = 'json') {
  const dir = `${root}.math-work`;
  mkdirSync(dir, { recursive: true });
  const path = `${dir}/${prefix}-${new Date().toISOString().replaceAll(':', '-')}-${process.pid}.${extension}`;
  writeFileSync(path, content);
  return path;
}
export function run(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 660_000, maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed (${result.status ?? result.signal}): ${result.error?.message ?? ''}\n${result.stderr ?? ''}\n${result.stdout ?? ''}`);
  }
  return result.stdout;
}
const signedTerm = n => `${n < 0 ? '-' : '+'} ${Math.abs(n)}`;
export const factorChoice = ([p, q]) => `(x ${signedTerm(p)})(x ${signedTerm(q)})`;
export const radicalChoice = ([a, b]) => b === 1 ? String(a) : `${a === 1 ? '' : a}√${b}`;
export function blindProblem(unit, p) {
  if (unit === 'pythagoras') return {
    id: p.id, type: 'pythagoras',
    figure: { rightAngle: p.figure.rightAngle, given: p.figure.given.map(side => {
      const [a, b] = [...side].map(v => p.figure.points[v]);
      return { side, length: Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) };
    }), unknown: p.figure.unknown }, choices: p.choices.map(radicalChoice),
  };
  if (unit === 'factorization') {
    const a = p.p + p.q, b = p.p * p.q;
    return { id: p.id, type: 'factorization', trinomial: `x^2${a ? ` ${signedTerm(a).replace(/ 1$/, ' ')}x` : ''}${b ? ` ${signedTerm(b)}` : ''}`, choices: p.choices.map(factorChoice) };
  }
  // The reviewer sees the formulas as learners do, rendered (÷ and fraction bars, not ':' and '/').
  if (isFormulaUnit(unit)) return {
    id: p.id, type: 'formula', kind: p.kind,
    question: p.kind === 'solve' ? statementTex(p.question) : expressionTex(p.question),
    given: p.given && solutionTex(p.given, 'x'),
    choices: p.choices.map(choice => p.kind === 'solve' ? solutionTex(choice, unknownOf(p.question)) : expressionTex(choice)),
  };
  if (p.word !== null) return { id: p.id, type: 'word', word: Object.fromEntries(['ja', 'en', 'zh'].map(locale => [locale, { prompt: p.word[locale].prompt, unit: p.word[locale].unit }])), choices: p.choices };
  return { id: p.id, type: 'expression', expression: p.expression, choices: p.choices };
}
export function compareReviews(unit, problems, result) {
  assert.equal(result.reviews.length, problems.length, 'Review count mismatch');
  const ids = new Set();
  for (const review of result.reviews) {
    assert.ok(problems.some(p => p.id === review.id) && !ids.has(review.id), `Unknown or duplicate review ID: ${review.id}`);
    ids.add(review.id);
    assert.ok(Array.isArray(review.issues) && review.issues.every(x => typeof x === 'string'), 'Invalid issues');
    assert.ok(Number.isInteger(review.choiceIndex), 'Invalid choiceIndex');
    assert.ok(review.wordExpression === null || typeof review.wordExpression === 'string', 'Invalid wordExpression');
  }
  return problems.map(p => {
    const review = result.reviews.find(r => r.id === p.id);
    const answer = unit === 'pythagoras' ? radicalChoice(p.choices[p.answerIndex]) : unit === 'factorization' ? factorChoice(p.choices[p.answerIndex]) : p.choices[p.answerIndex];
    // Formula answers can be written many ways; the chosen index decides.
    const matches = review.choiceIndex === p.answerIndex && (isFormulaUnit(unit) || review.answer === answer);
    const issues = [...review.issues];
    if (p.word && !review.wordExpression?.trim()) issues.push('文章題の立式がありません');
    return { id: p.id, matches, answer: review.answer, choiceIndex: review.choiceIndex, wordExpression: review.wordExpression, issues };
  });
}
