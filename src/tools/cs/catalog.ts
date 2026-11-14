// Computer science practice (/cs): unit → learning item → practice set, the same shape and pages as /ai-ds (lib/practice.ts,
// components/practice/). One catalog for the IPA exams (ITパスポート Ver.6.5, 基本情報技術者 Ver.9.2, 応用情報技術者 Ver.7.2)
// and the university curriculum (情報処理学会 J17-CS, its core units): each item says which of them it belongs to (`exams`). That
// mapping is this site's reading of the published syllabi (docs/plans/cs-practice.md §5). `check` says how its problems will be
// checked before they are published (§4): `calc` recomputed, `run` the pseudocode executed, `sql` run on SQLite, `machine` an
// automaton or grammar run, `knowledge` only the blind review.
// Display order and stable IDs only; names live under App.cs in messages/*.json, problems in ./data/<unit>.json.
import { findPracticeItem, unpublishedPath, type PracticeBook, type PracticeItem, type PracticeUnit } from '../../lib/practice.ts';

export type CsExam = 'ip' | 'fe' | 'ap' | 'univ';
export type CsCheck = 'calc' | 'run' | 'sql' | 'machine' | 'knowledge';
export interface CsItem extends PracticeItem<CsExam> { check: CsCheck }
export interface CsUnit extends PracticeUnit<CsExam> { items: readonly CsItem[] }

export const CS_EXAMS: readonly CsExam[] = ['ip', 'fe', 'ap', 'univ'];

// One five-problem set per item to begin with.
const sets = [{ id: '1' }] as const;
const item = (id: string, exams: CsExam[], check: CsCheck): CsItem => ({ id, exams, check, sets });

export const CS_CATALOG: readonly CsUnit[] = [
  { id: 'discrete', items: [
    item('bases', ['ip', 'fe', 'ap', 'univ'], 'calc'),
    item('integers', ['fe', 'ap', 'univ'], 'calc'),
    item('reals', ['fe', 'ap', 'univ'], 'calc'),
    item('logic', ['ip', 'fe', 'ap', 'univ'], 'calc'),
    item('sets', ['ip', 'fe', 'univ'], 'calc'),
    item('proofs', ['univ'], 'knowledge'),
    item('counting', ['ip', 'fe', 'ap', 'univ'], 'calc'),
    item('graphs', ['fe', 'univ'], 'calc'),
  ] },
  { id: 'data-structures', items: [
    item('lists', ['fe', 'ap', 'univ'], 'run'),
    item('stacks-queues', ['ip', 'fe', 'ap', 'univ'], 'run'),
    item('trees', ['fe', 'ap', 'univ'], 'run'),
    item('heaps', ['fe', 'ap', 'univ'], 'run'),
    item('hashing', ['fe', 'ap', 'univ'], 'run'),
    item('graph-representation', ['fe', 'univ'], 'run'),
  ] },
  { id: 'algorithms', items: [
    item('complexity', ['fe', 'ap', 'univ'], 'calc'),
    item('searching', ['ip', 'fe', 'ap', 'univ'], 'run'),
    item('sorting', ['fe', 'ap', 'univ'], 'run'),
    item('recursion', ['fe', 'ap', 'univ'], 'run'),
    item('strings', ['fe', 'ap', 'univ'], 'run'),
    item('design', ['ap', 'univ'], 'run'),
    item('graph-algorithms', ['ap', 'univ'], 'run'),
    item('numeric', ['fe', 'ap', 'univ'], 'run'),
  ] },
  { id: 'programming', items: [
    item('pseudocode', ['ip', 'fe', 'ap'], 'run'),
    item('functions', ['fe', 'ap', 'univ'], 'run'),
    item('oop', ['fe', 'ap', 'univ'], 'run'),
    item('functional', ['univ'], 'run'),
    item('types', ['univ'], 'knowledge'),
    item('translation', ['fe', 'ap', 'univ'], 'knowledge'),
    item('grammars', ['fe', 'ap', 'univ'], 'machine'),
  ] },
  { id: 'theory', items: [
    item('automata', ['fe', 'ap', 'univ'], 'machine'),
    item('languages', ['univ'], 'machine'),
    item('computability', ['univ'], 'knowledge'),
    item('complexity-classes', ['ap'], 'knowledge'),
    item('coding', ['fe', 'ap', 'univ'], 'calc'),
  ] },
  { id: 'architecture', items: [
    item('circuits', ['ip', 'fe', 'ap', 'univ'], 'calc'),
    item('instructions', ['fe', 'ap', 'univ'], 'run'),
    item('performance', ['ip', 'fe', 'ap', 'univ'], 'calc'),
    item('memory', ['ip', 'fe', 'ap', 'univ'], 'calc'),
    item('io', ['fe', 'ap', 'univ'], 'knowledge'),
    item('storage', ['ip', 'fe', 'ap'], 'calc'),
  ] },
  { id: 'os', items: [
    item('basics', ['ip', 'fe', 'univ'], 'knowledge'),
    item('processes', ['fe', 'ap', 'univ'], 'knowledge'),
    item('scheduling', ['fe', 'ap', 'univ'], 'run'),
    item('concurrency', ['fe', 'ap', 'univ'], 'run'),
    item('memory-management', ['fe', 'ap', 'univ'], 'run'),
    item('files', ['ip', 'fe'], 'run'),
  ] },
  { id: 'systems', items: [
    item('configurations', ['ip', 'fe', 'ap', 'univ'], 'knowledge'),
    item('reliability', ['ip', 'fe', 'ap', 'univ'], 'calc'),
    item('evaluation', ['fe', 'ap', 'univ'], 'calc'),
    item('parallel', ['ap', 'univ'], 'calc'),
  ] },
  { id: 'databases', items: [
    item('relational', ['ip', 'fe', 'ap', 'univ'], 'sql'),
    item('normalization', ['ip', 'fe', 'ap', 'univ'], 'knowledge'),
    item('sql-queries', ['ip', 'fe', 'ap', 'univ'], 'sql'),
    item('sql-definitions', ['fe', 'ap', 'univ'], 'sql'),
    item('transactions', ['fe', 'ap', 'univ'], 'knowledge'),
    item('recovery', ['fe', 'ap'], 'knowledge'),
  ] },
  { id: 'networks', items: [
    item('layers', ['ip', 'fe', 'ap', 'univ'], 'knowledge'),
    item('addressing', ['ip', 'fe', 'ap', 'univ'], 'calc'),
    item('transport', ['fe', 'ap', 'univ'], 'knowledge'),
    item('routing-lan', ['fe', 'ap', 'univ'], 'knowledge'),
    item('applications', ['ip', 'fe', 'ap', 'univ'], 'knowledge'),
    item('transmission', ['ip', 'fe', 'ap'], 'calc'),
  ] },
  { id: 'security', items: [
    item('fundamentals', ['ip', 'fe', 'ap', 'univ'], 'knowledge'),
    item('cryptography', ['ip', 'fe', 'ap', 'univ'], 'calc'),
    item('authentication', ['ip', 'fe', 'ap', 'univ'], 'knowledge'),
    item('attacks', ['ip', 'fe', 'ap', 'univ'], 'knowledge'),
    item('defenses', ['ip', 'fe', 'ap', 'univ'], 'run'),
    item('management', ['ip', 'fe', 'ap'], 'knowledge'),
  ] },
  { id: 'software-engineering', items: [
    item('processes', ['ip', 'fe', 'ap', 'univ'], 'knowledge'),
    item('design', ['fe', 'ap', 'univ'], 'knowledge'),
    item('testing', ['fe', 'ap', 'univ'], 'run'),
    item('maintenance', ['fe', 'ap', 'univ'], 'knowledge'),
    item('estimation', ['fe', 'ap'], 'calc'),
  ] },
  { id: 'media', items: [
    item('characters', ['ip', 'fe', 'univ'], 'calc'),
    item('digitization', ['ip', 'fe', 'ap', 'univ'], 'calc'),
    item('ui', ['ip', 'fe', 'univ'], 'knowledge'),
    item('graphics', ['fe'], 'calc'),
  ] },
  { id: 'management', items: [
    item('projects', ['ip', 'fe', 'ap'], 'calc'),
    item('services', ['ip', 'fe', 'ap'], 'knowledge'),
    item('audit', ['ip', 'fe', 'ap'], 'knowledge'),
  ] },
  { id: 'strategy', items: [
    item('accounting', ['ip', 'fe', 'ap'], 'calc'),
    item('business-strategy', ['ip', 'fe', 'ap'], 'knowledge'),
    item('law', ['ip', 'fe', 'ap', 'univ'], 'knowledge'),
    item('ethics', ['ip', 'fe', 'univ'], 'knowledge'),
  ] },
];

export const findCsItem = (unit: string | undefined, item: string | undefined) => findPracticeItem(CS_CATALOG, unit, item) as CsItem | undefined;

// What the shared pages (components/practice/) need of this book.
export const CS_BOOK: PracticeBook<CsExam> = { base: '/cs', messages: 'cs', exams: CS_EXAMS, catalog: CS_CATALOG };

// Not yet in the app catalog, the top page or the sitemap: every /cs page is kept out of search results (root.tsx and the
// Worker, as /ai-ds) until it is registered in src/lib/app-catalog.ts.
export const isUnpublishedCsPath = unpublishedPath('cs');
