import { renderArchDemo } from './demos/arch';
import { renderEvalStatsDemo } from './demos/eval-stats';
import { renderInfoLinalgDemo } from './demos/info-linalg';
import { renderMlDemo } from './demos/ml';
import { renderNnDemo } from './demos/nn';

export default function AiDsDemo({ unit, item }: { unit: string; item: string }) {
  const key = `${unit}/${item}`;
  return (
    renderInfoLinalgDemo(key) ??
    renderArchDemo(key) ??
    renderNnDemo(key) ??
    renderEvalStatsDemo(key) ??
    renderMlDemo(key)
  );
}
