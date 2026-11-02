import { useId } from 'react';
import { useLocale } from 'use-intl';
import { layoutGraph, type LessonGraph } from '../lib/math-lesson-graph';
import type { LessonFigure as Figure } from '../lib/math-lessons';
import MathShape from './math-shape';
import MathText from './math-text';
import styles from './math-lesson-figure.module.css';

// A figure in a lesson: a shape drawn by MathShape from its numbers (the same drawings the quiz problems use, with the
// unknown marked x), or a coordinate graph (lib/math-lesson-graph.ts). Its caption is shown under it and read out as
// its description.
export default function LessonFigure({ figure }: { figure: Figure }) {
  const locale = useLocale() as 'ja' | 'en' | 'zh';
  const caption = figure.caption[locale] ?? figure.caption.en;
  const description = caption.replace(/\$/g, '');
  return <figure className={styles.figure}>
    {'shape' in figure ? <MathShape which={figure.shape} question={figure.numbers} label={description} /> : <LessonGraphSvg graph={figure.graph} label={description} />}
    <figcaption className={styles.caption}><MathText text={caption} /></figcaption>
  </figure>;
}

function LessonGraphSvg({ graph, label }: { graph: LessonGraph; label: string }) {
  const clipId = useId();
  const layout = layoutGraph(graph);
  const { box } = layout;
  return <svg className={styles.graph} viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label={label}>
    {layout.region && <path className={styles.region} d={layout.region} />}
    {layout.gridX.map(x => <line key={`gx${x}`} className={styles.grid} x1={x} y1={box.y0} x2={x} y2={box.y1} />)}
    {layout.gridY.map(y => <line key={`gy${y}`} className={styles.grid} x1={box.x0} y1={y} x2={box.x1} y2={y} />)}
    {layout.axisY !== null && <line className={styles.axis} x1={box.x0} y1={layout.axisY} x2={box.x1} y2={layout.axisY} />}
    {layout.axisX !== null && <line className={styles.axis} x1={layout.axisX} y1={box.y0} x2={layout.axisX} y2={box.y1} />}
    {layout.axisY !== null && <text className={styles.axisName} x={box.x1 + 4} y={layout.axisY + 4}>x</text>}
    {layout.axisX !== null && <text className={styles.axisName} x={layout.axisX + 6} y={box.y0 - 8}>y</text>}
    {layout.axisX !== null && layout.axisY !== null && <text className={styles.axisName} x={layout.axisX - 12} y={layout.axisY + 14}>O</text>}
    {layout.ticksX.map(tick => <text key={`tx${tick.value}`} className={styles.tick} x={tick.at} y={(layout.axisY ?? box.y1) + 13} textAnchor="middle">{tick.label}</text>)}
    {layout.ticksY.map(tick => <text key={`ty${tick.value}`} className={styles.tick} x={(layout.axisX ?? box.x0) - 5} y={tick.at + 4} textAnchor="end">{tick.label}</text>)}
    <clipPath id={clipId}><rect x={box.x0} y={box.y0} width={box.x1 - box.x0} height={box.y1 - box.y0} /></clipPath>
    {layout.curves.map((curve, index) => curve.d && <path key={index} clipPath={`url(#${clipId})`} className={styles.curve} data-n={index % 4} data-dashed={curve.dashed || undefined} d={curve.d} />)}
    {layout.points.map((point, index) => <circle key={index} className={styles.point} data-hollow={point.hollow || undefined} cx={point.x} cy={point.y} r={4.2} />)}
    {layout.curves.map((curve, index) => curve.label && <text key={`cl${index}`} className={styles.name} data-n={index % 4} x={curve.label.x} y={Math.max(12, curve.label.y)} textAnchor={curve.label.anchor}>{curve.label.text}</text>)}
    {layout.points.map((point, index) => point.label && <text key={`pl${index}`} className={styles.name} x={point.label.x} y={Math.max(12, point.label.y)} textAnchor={point.label.anchor}>{point.label.text}</text>)}
  </svg>;
}
