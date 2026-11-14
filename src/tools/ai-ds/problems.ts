// The AI and data science problems: ./data/<unit>.json, one bank per unit, bundled with the page (no database). A problem is a
// question with four choices in Japanese (the three exams are Japanese), $...$ marking TeX. Only published ones are served: a
// problem is published once scripts/verify_ds.py has recomputed its answer (a `check`, for calculations) and a model other than
// its writer has solved it blind and found nothing wrong (scripts/ai-ds-generate.mjs; docs/plans/ai-ds-practice.md §4).

export interface AiDsCheckSpec {
  // The answer, as an expression over scripts/verify_ds.py's functions ("entropy([0.5, 0.25, 0.25])").
  expr: string;
  // The number each choice stands for, in the choices' order; exactly one must equal expr.
  values: [number, number, number, number];
  // How far a choice may be from expr and still count as it (rounded choices); 1e-9 when absent.
  tol?: number;
}

export interface AiDsProblem {
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
  check?: AiDsCheckSpec;
}

export interface AiDsQuestion { id: string; tier: number; question: string; choices: string[]; answerIndex: number; explanation: string }

const banks = import.meta.glob<{ problems: AiDsProblem[] }>('./data/*.json', { eager: true, import: 'default' });
const bankOf = (unit: string) => banks[`./data/${unit}.json`]?.problems ?? [];

// A set's published problems in order, without what only the checks need.
export function getAiDsSet(unit: string, item: string, setId: string): AiDsQuestion[] {
  return bankOf(unit).filter(p => p.item === item && p.setId === setId && p.published).sort((a, b) => a.position - b.position)
    .map(({ id, tier, question, choices, answerIndex, explanation }) => ({ id, tier, question, choices, answerIndex, explanation }));
}

// "unit/item/set" of every set with published problems; the rest are shown as being prepared.
export function getPlayableAiDsSets(): string[] {
  const out = new Set<string>();
  for (const [path, bank] of Object.entries(banks)) {
    const unit = path.slice('./data/'.length, -'.json'.length);
    for (const p of bank.problems) if (p.published) out.add(`${unit}/${p.item}/${p.setId}`);
  }
  return [...out];
}
