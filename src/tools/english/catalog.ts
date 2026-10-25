// English practice (/english): unit → learning item → practice set, as in math (src/lib/math-catalog.ts). Each item has a
// level on CEFR-J (the CEFR with its lower bands split for learners in Japan), which plays the part of math's school year:
// the catalog stays test-neutral, and the Eiken grades (and later TOEIC and TOEFL scores) are mapped onto it below, as math
// maps its items onto Japan's school years. Display order and stable IDs only; no problem data here. Names live under
// App.english in messages/*.json. See docs/plans/english-practice.md.

export type EnglishLevel = 'pre-a1' | 'a1.1' | 'a1.2' | 'a1.3' | 'a2.1' | 'a2.2' | 'b1.1' | 'b1.2' | 'b2.1' | 'b2.2' | 'c1' | 'c2';
export type EnglishGrade = 'e5' | 'e4' | 'e3' | 'ep2' | 'e2' | 'ep1' | 'e1';
export type EnglishUnit = 'grammar' | 'vocab';
export interface EnglishSet { id: string }
export interface EnglishItem { id: string; level: EnglishLevel; sets: readonly EnglishSet[] }

// Easiest first.
export const ENGLISH_LEVELS: readonly EnglishLevel[] = ['pre-a1', 'a1.1', 'a1.2', 'a1.3', 'a2.1', 'a2.2', 'b1.1', 'b1.2', 'b2.1', 'b2.2', 'c1', 'c2'];
// "Pre-A1", "A1.1", ...: the same in every language.
export const levelLabel = (level: EnglishLevel) => level === 'pre-a1' ? 'Pre-A1' : level.toUpperCase();

// The Eiken grades as ranges of levels, easiest first. The bands follow the Eiken Foundation's published CEFR mapping (grade 3 is
// A1, pre-2 A2, 2 B1, pre-1 B2, 1 C1); grades 5 and 4, which it puts below A1, and the split within each band are this site's guide.
export const EIKEN_GRADES: readonly { id: EnglishGrade; levels: readonly EnglishLevel[] }[] = [
  { id: 'e5', levels: ['pre-a1'] },
  { id: 'e4', levels: ['a1.1'] },
  { id: 'e3', levels: ['a1.2', 'a1.3'] },
  { id: 'ep2', levels: ['a2.1', 'a2.2'] },
  { id: 'e2', levels: ['b1.1', 'b1.2'] },
  { id: 'ep1', levels: ['b2.1', 'b2.2'] },
  { id: 'e1', levels: ['c1', 'c2'] },
];
export const ENGLISH_GRADES: readonly EnglishGrade[] = EIKEN_GRADES.map(grade => grade.id);
export const gradeOfLevel = (level: EnglishLevel): EnglishGrade => EIKEN_GRADES.find(grade => grade.levels.includes(level))!.id;
export const levelsOfGrade = (grade: EnglishGrade): readonly EnglishLevel[] => EIKEN_GRADES.find(entry => entry.id === grade)!.levels;
export const ENGLISH_UNITS: readonly EnglishUnit[] = ['grammar', 'vocab'];

// A grade's test: this many problems drawn from its items (as math's test per school year).
export const ENGLISH_TEST_SIZE = 10;
// The placement test (実力判定テスト): this many problems, the level going up after a right answer and down after a wrong one, as
// math's (src/lib/math-placement.ts). It is offered once every grade has ENGLISH_PLACEMENT_POOL published problems to draw from.
export const ENGLISH_PLACEMENT_SIZE = 15;
export const ENGLISH_PLACEMENT_POOL = 8;

// Every item has two five-problem sets to begin with.
const sets = [{ id: '1' }, { id: '2' }] as const;
const items = (level: EnglishLevel, ids: string[]): EnglishItem[] => ids.map(id => ({ id, level, sets }));

export const ENGLISH_CATALOG: Readonly<Record<EnglishUnit, readonly EnglishItem[]>> = {
  grammar: [
    ...items('pre-a1', ['be-verb', 'present-simple', 'plural-nouns', 'pronouns', 'wh-questions', 'imperatives', 'can', 'present-progressive', 'prepositions']),
    ...items('a1.1', ['past-simple', 'past-progressive', 'future', 'modals', 'comparison', 'infinitives', 'gerunds', 'conjunctions', 'there-is']),
    ...items('a1.2', ['present-perfect', 'passive', 'infinitives-advanced', 'relative-pronouns', 'participles', 'indirect-questions', 'comparison-advanced', 'tag-questions']),
    ...items('a2.1', ['relative-adverbs', 'relative-what', 'present-perfect-progressive', 'past-perfect', 'subjunctive-past', 'participle-clauses', 'causative-perception']),
    ...items('b1.1', ['subjunctive-past-perfect', 'subjunctive-advanced', 'participle-clauses-advanced', 'cleft-sentences', 'inversion', 'inanimate-subjects']),
    ...items('b2.1', ['inversion-advanced', 'ellipsis-apposition', 'verb-patterns']),
  ],
  vocab: [
    ...items('pre-a1', ['everyday-nouns', 'basic-verbs', 'basic-adjectives', 'numbers-days']),
    ...items('a1.1', ['daily-words', 'basic-idioms']),
    ...items('a1.2', ['school-life-words', 'idioms']),
    ...items('a2.1', ['society-words', 'phrasal-verbs']),
    ...items('b1.1', ['social-science-words', 'phrasal-verbs-advanced']),
    ...items('b2.1', ['advanced-words', 'advanced-phrasal-verbs']),
    ...items('c1', ['expert-words', 'expert-phrasal-verbs']),
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
