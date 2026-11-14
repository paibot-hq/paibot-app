// Practice books (/ai-ds, /cs): four-choice problem sets organised unit → learning item → practice set, as math, over the
// scope of some exams and curricula. Each book is a tool folder (src/tools/<slug>/) with its catalog, its problem banks
// (data/<unit>.json, bundled with the page, no database) and its lessons (lessons.json); the pages and these helpers are shared
// (components/practice/). Names live under App.<book> in messages/*.json, what every book says the same under App.practice.

export interface PracticeSet { id: string }
export interface PracticeItem<E extends string = string> { id: string; exams: readonly E[]; check: string; sets: readonly PracticeSet[] }
export interface PracticeUnit<E extends string = string> { id: string; items: readonly PracticeItem<E>[] }

// What the shared pages need to know of a book.
export interface PracticeBook<E extends string = string> {
  // The book's path ('/ai-ds') and the key of its messages under App ('aiDs').
  base: string;
  messages: string;
  exams: readonly E[];
  catalog: readonly PracticeUnit<E>[];
}

// A problem as a bank keeps it: a question with four choices in Japanese, $...$ marking TeX. A calculation carries `check`,
// which the book's verifier recomputes; only `published` problems (checked, then passed by a blind review) are served.
export interface PracticeProblem {
  id: string;
  item: string;
  setId: string;
  position: number;
  tier: 1 | 2 | 3;
  published: boolean;
  reviewedAt?: string;
  question: string;
  choices: [string, string, string, string];
  answerIndex: number;
  explanation: string;
  check?: { expr: string; values: [number, number, number, number]; tol?: number };
}
export interface PracticeQuestion { id: string; tier: number; question: string; choices: string[]; answerIndex: number; explanation: string }

// The textbook text of an item page, in Japanese. A lesson without reviewedAt has not passed review and is not shown.
export interface PracticeLessonSection { heading: string; paragraphs: string[]; formulas?: string[]; after?: string[] }
export interface PracticeLessonExample { prompt: string; steps: string[]; answer: string; check?: { expr: string; value: number; tol?: number } }
export interface PracticeLesson { sections: PracticeLessonSection[]; examples: PracticeLessonExample[]; reviewedAt?: string }

export const findPracticeItem = <E extends string>(catalog: readonly PracticeUnit<E>[], unit?: string, item?: string) =>
  catalog.find(entry => entry.id === unit)?.items.find(entry => entry.id === item);

// A book not yet in the app catalog stays out of search results: its pages and their data requests.
export const unpublishedPath = (slug: string) => {
  const pattern = new RegExp(`^/(?:ja|en|zh)/${slug}(?:\\.data|/|$)`);
  return (pathname: string) => pattern.test(pathname);
};

// The banks of a book, from import.meta.glob('./data/*.json') in its folder.
export function practiceBanks(banks: Record<string, { problems: PracticeProblem[] }>) {
  const bankOf = (unit: string) => banks[`./data/${unit}.json`]?.problems ?? [];
  return {
    // A set's published problems in order, without what only the checks need.
    set(unit: string, item: string, setId: string): PracticeQuestion[] {
      return bankOf(unit).filter(p => p.item === item && p.setId === setId && p.published).sort((a, b) => a.position - b.position)
        .map(({ id, tier, question, choices, answerIndex, explanation }) => ({ id, tier, question, choices, answerIndex, explanation }));
    },
    // "unit/item/set" of every set with published problems; the rest are shown as being prepared.
    playable(): string[] {
      const out = new Set<string>();
      for (const [path, bank] of Object.entries(banks)) {
        const unit = path.slice('./data/'.length, -'.json'.length);
        for (const p of bank.problems) if (p.published) out.add(`${unit}/${p.item}/${p.setId}`);
      }
      return [...out];
    },
  };
}

export function practiceLesson(lessons: Record<string, PracticeLesson>, unit: string, item: string): PracticeLesson | null {
  const lesson = lessons[`${unit}/${item}`];
  return lesson?.reviewedAt ? lesson : null;
}

// The loaders of the three pages, the same for every book.
export function homeData<E extends string>(book: PracticeBook<E>, request: Request, playable: string[]) {
  const exam = new URL(request.url).searchParams.get('exam');
  return { exam: book.exams.includes(exam as E) ? exam as E : null, playable };
}

export function itemData<E extends string>(book: PracticeBook<E>, params: { unit?: string; item?: string }, playable: string[],
  lesson: (unit: string, item: string) => PracticeLesson | null) {
  const item = findPracticeItem(book.catalog, params.unit, params.item);
  if (!item) throw new Response('Not Found', { status: 404 });
  const items = book.catalog.find(unit => unit.id === params.unit)!.items;
  const at = items.indexOf(item);
  return {
    unit: params.unit!, item: item.id, exams: item.exams as readonly string[], lesson: lesson(params.unit!, item.id),
    neighbors: { previous: items[at - 1]?.id ?? null, next: items[at + 1]?.id ?? null },
    sets: item.sets.map(set => ({ id: set.id, ready: playable.includes(`${params.unit}/${item.id}/${set.id}`) })),
  };
}

export function setData<E extends string>(book: PracticeBook<E>, params: { unit?: string; item?: string; set?: string },
  questions: (unit: string, item: string, setId: string) => PracticeQuestion[]) {
  const item = findPracticeItem(book.catalog, params.unit, params.item);
  const at = item?.sets.findIndex(entry => entry.id === params.set) ?? -1;
  if (!item || at < 0) throw new Response('Not Found', { status: 404 });
  const set = item.sets[at];
  return { unit: params.unit!, item: item.id, set: set.id, next: item.sets[at + 1]?.id ?? null, questions: questions(params.unit!, item.id, set.id) };
}
