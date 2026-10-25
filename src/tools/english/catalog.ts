// English practice (/english): unit → learning item → practice set, as in math (src/lib/math-catalog.ts), with the
// level (Eiken grade 5 to grade 1) in place of the school year. Display order and stable IDs only; no problem data
// here. Names live under App.english in messages/*.json. The levels are this site's guide, not the official scope.
// See docs/plans/english-practice.md.

export type EnglishGrade = 'e5' | 'e4' | 'e3' | 'ep2' | 'e2' | 'ep1' | 'e1';
export type EnglishUnit = 'grammar' | 'vocab';
export interface EnglishSet { id: string }
export interface EnglishItem { id: string; grade: EnglishGrade; sets: readonly EnglishSet[] }

// Easiest first: 5, 4, 3, pre-2, 2, pre-1, 1.
export const ENGLISH_GRADES: readonly EnglishGrade[] = ['e5', 'e4', 'e3', 'ep2', 'e2', 'ep1', 'e1'];
export const ENGLISH_UNITS: readonly EnglishUnit[] = ['grammar', 'vocab'];

// A level's test: this many problems drawn from its items (as math's test per school year).
export const ENGLISH_TEST_SIZE = 10;
// The placement test (実力判定テスト): this many problems, the level going up after a right answer and down after a wrong one, as
// math's (src/lib/math-placement.ts). It is offered once every level has ENGLISH_PLACEMENT_POOL published problems to draw from.
export const ENGLISH_PLACEMENT_SIZE = 15;
export const ENGLISH_PLACEMENT_POOL = 8;

// Every item has two five-problem sets to begin with.
const sets = [{ id: '1' }, { id: '2' }] as const;
const items = (grade: EnglishGrade, ids: string[]): EnglishItem[] => ids.map(id => ({ id, grade, sets }));

export const ENGLISH_CATALOG: Readonly<Record<EnglishUnit, readonly EnglishItem[]>> = {
  grammar: [
    ...items('e5', ['be-verb', 'present-simple', 'plural-nouns', 'pronouns', 'wh-questions', 'imperatives', 'can', 'present-progressive', 'prepositions']),
    ...items('e4', ['past-simple', 'past-progressive', 'future', 'modals', 'comparison', 'infinitives', 'gerunds', 'conjunctions', 'there-is']),
    ...items('e3', ['present-perfect', 'passive', 'infinitives-advanced', 'relative-pronouns', 'participles', 'indirect-questions', 'comparison-advanced', 'tag-questions']),
    ...items('ep2', ['relative-adverbs', 'relative-what', 'present-perfect-progressive', 'past-perfect', 'subjunctive-past', 'participle-clauses', 'causative-perception']),
    ...items('e2', ['subjunctive-past-perfect', 'subjunctive-advanced', 'participle-clauses-advanced', 'cleft-sentences', 'inversion', 'inanimate-subjects']),
    ...items('ep1', ['inversion-advanced', 'ellipsis-apposition', 'verb-patterns']),
  ],
  vocab: [
    ...items('e5', ['everyday-nouns', 'basic-verbs', 'basic-adjectives', 'numbers-days']),
    ...items('e4', ['daily-words', 'basic-idioms']),
    ...items('e3', ['school-life-words', 'idioms']),
    ...items('ep2', ['society-words', 'phrasal-verbs']),
    ...items('e2', ['social-science-words', 'phrasal-verbs-advanced']),
    ...items('ep1', ['advanced-words', 'advanced-phrasal-verbs']),
    ...items('e1', ['expert-words', 'expert-phrasal-verbs']),
  ],
};

export const isEnglishUnit = (unit: string | undefined): unit is EnglishUnit => ENGLISH_UNITS.includes(unit as EnglishUnit);

export function findEnglishItem(unit: string | undefined, item: string | undefined): EnglishItem | undefined {
  return isEnglishUnit(unit) ? ENGLISH_CATALOG[unit].find(entry => entry.id === item) : undefined;
}

// Not yet listed in the app catalog, the top page or the sitemap: every /english page is kept out of search results
// (the HTML robots tag in root.tsx and the Worker's X-Robots-Tag, .data requests included) until the first sets are
// published and the tool is registered in src/lib/app-catalog.ts.
export function isUnpublishedEnglishPath(pathname: string): boolean {
  return /^\/(?:ja|en|zh)\/english(?:\.data|\/|$)/.test(pathname);
}
