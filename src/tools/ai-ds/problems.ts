import { practiceBanks, type PracticeProblem } from '../../lib/practice';

// The AI and data science problems: ./data/<unit>.json, one bank per unit, bundled with the page (no database). A problem is
// published once scripts/verify_ds.py has recomputed its answer (a `check`, for calculations) and a model other than its writer
// has solved it blind and found nothing wrong (scripts/ai-ds-generate.mjs; docs/plans/ai-ds-practice.md §4).
export type AiDsProblem = PracticeProblem;

const banks = practiceBanks(import.meta.glob<{ problems: PracticeProblem[] }>('./data/*.json', { eager: true, import: 'default' }));
export const getAiDsSet = banks.set;
export const getPlayableAiDsSets = banks.playable;
