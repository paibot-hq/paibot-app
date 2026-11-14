import { practiceBanks, type PracticeProblem } from '../../lib/practice';

// The computer science problems: ./data/<unit>.json, one bank per unit, bundled with the page (no database). None are written
// yet; a problem will be published once its answer has been checked by machine where it can be (docs/plans/cs-practice.md §4)
// and a model other than its writer has solved it blind and found nothing wrong.
const banks = practiceBanks(import.meta.glob<{ problems: PracticeProblem[] }>('./data/*.json', { eager: true, import: 'default' }));
export const getCsSet = banks.set;
export const getPlayableCsSets = banks.playable;
