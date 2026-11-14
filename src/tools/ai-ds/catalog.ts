// AI and data science practice (/ai-ds): unit → learning item → practice set, as math (src/lib/math-catalog.ts). One catalog
// for three Japanese exams whose scopes overlap: each item says which of them it belongs to (`exams`: DS検定 リテラシーレベル,
// G検定, E資格), as math's items say their school year. That mapping is this site's reading of the published syllabi, not
// the exams' own. `check` says how its problems are checked before they are published: `calc` problems are recomputed by
// scripts/verify_ds.py, `knowledge` ones only by the blind review (docs/plans/ai-ds-practice.md §4).
// Display order and stable IDs only; names live under App.aiDs in messages/*.json, problems in ./data/<unit>.json.

export type AiDsExam = 'ds' | 'g' | 'e';
export type AiDsCheck = 'calc' | 'knowledge' | 'sql';
export interface AiDsSet { id: string }
export interface AiDsItem { id: string; exams: readonly AiDsExam[]; check: AiDsCheck; sets: readonly AiDsSet[] }
export interface AiDsUnit { id: string; items: readonly AiDsItem[] }

export const AI_DS_EXAMS: readonly AiDsExam[] = ['ds', 'g', 'e'];

// One five-problem set per item to begin with.
const sets = [{ id: '1' }] as const;
const item = (id: string, exams: AiDsExam[], check: AiDsCheck): AiDsItem => ({ id, exams, check, sets });

export const AI_DS_CATALOG: readonly AiDsUnit[] = [
  { id: 'stats', items: [
    item('descriptive', ['ds', 'g'], 'calc'),
    item('correlation', ['ds', 'g'], 'calc'),
    item('probability', ['g', 'e'], 'calc'),
    item('bayes', ['g', 'e'], 'calc'),
    item('distributions', ['g', 'e'], 'calc'),
    item('sampling', ['ds'], 'calc'),
    item('testing', ['ds', 'g'], 'calc'),
    item('estimation', ['g', 'e'], 'calc'),
    item('time-series', ['ds', 'g'], 'calc'),
  ] },
  { id: 'linalg', items: [
    item('matrices', ['ds', 'e'], 'calc'),
    item('eigen', ['g', 'e'], 'calc'),
    item('gradients', ['ds', 'g', 'e'], 'calc'),
    item('distances', ['g', 'e'], 'calc'),
  ] },
  { id: 'info', items: [
    item('entropy', ['e'], 'calc'),
    item('cross-entropy', ['g', 'e'], 'calc'),
    item('mutual-information', ['g', 'e'], 'calc'),
  ] },
  { id: 'data', items: [
    item('data-types', ['ds'], 'knowledge'),
    item('preprocessing', ['ds', 'g'], 'calc'),
    item('features', ['ds', 'g', 'e'], 'knowledge'),
    item('bias', ['ds', 'g'], 'knowledge'),
    item('visualization', ['ds'], 'knowledge'),
  ] },
  { id: 'dataeng', items: [
    item('sql-basics', ['ds'], 'sql'),
    item('sql-aggregation', ['ds'], 'sql'),
    item('sql-joins', ['ds'], 'sql'),
    item('table-design', ['ds'], 'knowledge'),
    item('platforms', ['ds'], 'knowledge'),
    item('security', ['ds'], 'knowledge'),
  ] },
  { id: 'ml', items: [
    item('learning-types', ['ds', 'g', 'e'], 'knowledge'),
    item('linear-regression', ['ds', 'g', 'e'], 'calc'),
    item('logistic-regression', ['g', 'e'], 'calc'),
    item('svm', ['g', 'e'], 'knowledge'),
    item('trees-ensembles', ['g', 'e'], 'calc'),
    item('knn', ['e'], 'calc'),
    item('clustering', ['ds', 'g', 'e'], 'calc'),
    item('dimensionality-reduction', ['g', 'e'], 'calc'),
    item('recommendation', ['ds', 'g'], 'knowledge'),
    item('reinforcement-learning', ['g'], 'calc'),
  ] },
  { id: 'eval', items: [
    item('validation', ['ds', 'g', 'e'], 'knowledge'),
    item('classification-metrics', ['ds', 'g', 'e'], 'calc'),
    item('roc-auc', ['g', 'e'], 'calc'),
    item('regression-metrics', ['g', 'e'], 'calc'),
    item('overfitting', ['g', 'e'], 'calc'),
    item('task-metrics', ['e'], 'calc'),
  ] },
  { id: 'nn', items: [
    item('perceptron', ['g', 'e'], 'calc'),
    item('activations', ['g', 'e'], 'calc'),
    item('losses', ['g', 'e'], 'calc'),
    item('backpropagation', ['g', 'e'], 'calc'),
    item('optimizers', ['g', 'e'], 'calc'),
    item('initialization', ['e'], 'calc'),
    item('regularization', ['g', 'e'], 'knowledge'),
    item('normalization', ['g', 'e'], 'calc'),
    item('hyperparameters', ['g', 'e'], 'knowledge'),
    item('hardware', ['g'], 'knowledge'),
  ] },
  { id: 'arch', items: [
    item('convolution', ['g', 'e'], 'calc'),
    item('pooling', ['g', 'e'], 'calc'),
    item('skip-connections', ['g', 'e'], 'knowledge'),
    item('rnn', ['g', 'e'], 'calc'),
    item('lstm-gru', ['g', 'e'], 'knowledge'),
    item('attention', ['g', 'e'], 'knowledge'),
    item('transformer', ['g', 'e'], 'calc'),
    item('augmentation', ['g', 'e'], 'knowledge'),
  ] },
  { id: 'apps', items: [
    item('image-recognition', ['g', 'e'], 'knowledge'),
    item('detection-segmentation', ['g', 'e'], 'knowledge'),
    item('nlp', ['ds', 'g', 'e'], 'knowledge'),
    item('speech', ['g', 'e'], 'knowledge'),
    item('generative-models', ['g', 'e'], 'knowledge'),
    item('deep-rl', ['g', 'e'], 'knowledge'),
    item('learning-methods', ['g', 'e'], 'knowledge'),
    item('multimodal', ['g'], 'knowledge'),
    item('explainability', ['g', 'e'], 'knowledge'),
    item('efficiency', ['g', 'e'], 'knowledge'),
  ] },
  { id: 'history', items: [
    item('what-is-ai', ['g'], 'knowledge'),
    item('debates', ['g'], 'knowledge'),
    item('search', ['g'], 'knowledge'),
    item('knowledge-representation', ['g'], 'knowledge'),
    item('deep-learning-history', ['g'], 'knowledge'),
  ] },
  { id: 'practice', items: [
    item('projects', ['ds', 'g'], 'knowledge'),
    item('data-pipeline', ['ds', 'g'], 'knowledge'),
    item('operations', ['ds', 'g'], 'knowledge'),
  ] },
  { id: 'ethics', items: [
    item('privacy-law', ['ds', 'g'], 'knowledge'),
    item('intellectual-property', ['g'], 'knowledge'),
    item('contracts', ['g'], 'knowledge'),
    item('guidelines', ['ds', 'g'], 'knowledge'),
    item('fairness-safety', ['ds', 'g'], 'knowledge'),
    item('generative-ai-risks', ['ds', 'g'], 'knowledge'),
  ] },
  { id: 'business', items: [
    item('problem-definition', ['ds'], 'knowledge'),
    item('analysis-design', ['ds'], 'calc'),
    item('use-cases', ['ds'], 'knowledge'),
    item('value-creation', ['ds'], 'knowledge'),
  ] },
];

export function findAiDsItem(unit: string | undefined, item: string | undefined): AiDsItem | undefined {
  return AI_DS_CATALOG.find(entry => entry.id === unit)?.items.find(entry => entry.id === item);
}

// Not yet in the app catalog, the top page or the sitemap: every /ai-ds page is kept out of search results (the HTML robots tag in
// root.tsx and the Worker's X-Robots-Tag, .data requests included) until it is registered in src/lib/app-catalog.ts.
export function isUnpublishedAiDsPath(pathname: string): boolean {
  return /^\/(?:ja|en|zh)\/ai-ds(?:\.data|\/|$)/.test(pathname);
}
