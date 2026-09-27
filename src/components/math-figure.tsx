import { useId } from 'react';
import { useTranslations } from 'use-intl';
import { sideSquared, type RightTriangleFigure, type Vertex } from '../lib/math-pythagoras';
import styles from './math-figure.module.css';

const vertices: Vertex[] = ['A', 'B', 'C'];
type Point = [number, number];
const unit = ([x, y]: Point): Point => { const d = Math.hypot(x, y); return [x / d, y / d]; };
export default function MathFigure({ figure }: { figure: RightTriangleFigure }) {
  const t = useTranslations('App.math.pythagoras');
  const descriptionId = useId();
  const raw = vertices.map(v => figure.points[v]);
  const minX = Math.min(...raw.map(p => p[0])), maxX = Math.max(...raw.map(p => p[0]));
  const minY = Math.min(...raw.map(p => p[1])), maxY = Math.max(...raw.map(p => p[1]));
  const scale = Math.min(220 / (maxX - minX), 160 / (maxY - minY));
  const points = Object.fromEntries(vertices.map(v => [v, [
    180 + (figure.points[v][0] - (minX + maxX) / 2) * scale,
    140 - (figure.points[v][1] - (minY + maxY) / 2) * scale,
  ]])) as Record<Vertex, Point>;
  const center: Point = [vertices.reduce((s, v) => s + points[v][0], 0) / 3, vertices.reduce((s, v) => s + points[v][1], 0) / 3];
  const o = points[figure.rightAngle];
  const [u, v] = vertices.filter(v => v !== figure.rightAngle).map(v => unit([points[v][0] - o[0], points[v][1] - o[1]]));
  const markerSize = Math.min(12, ...vertices.filter(v => v !== figure.rightAngle).map(v => Math.hypot(points[v][0] - o[0], points[v][1] - o[1]) / 4));
  const marker = [[u[0], u[1]], [u[0] + v[0], u[1] + v[1]], [v[0], v[1]]].map(p => `${o[0] + p[0] * markerSize},${o[1] + p[1] * markerSize}`).join(' ');
  const [first, second] = figure.given;
  const description = t('figureDescription', { rightAngle: figure.rightAngle, first, firstLength: Math.sqrt(sideSquared(figure, first)), second, secondLength: Math.sqrt(sideSquared(figure, second)), unknown: figure.unknown });
  return <svg className={styles.figure} viewBox="0 0 360 280" role="img" aria-labelledby={descriptionId}>
    <title id={descriptionId}>{description}</title>
    <polygon className={styles.edge} points={vertices.map(v => points[v].join(',')).join(' ')} />
    <polyline className={styles.marker} points={marker} />
    {vertices.map(v => {
      const p = points[v], direction = unit([p[0] - center[0], p[1] - center[1]]);
      return <text key={v} x={p[0] + direction[0] * 22} y={p[1] + direction[1] * 22}>{v}</text>;
    })}
    {[...figure.given, figure.unknown].map(side => {
      const [a, b] = [...side].map(v => points[v as Vertex]);
      const midpoint: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      let normal = unit([b[1] - a[1], a[0] - b[0]]);
      if (normal[0] * (midpoint[0] - center[0]) + normal[1] * (midpoint[1] - center[1]) < 0) normal = [-normal[0], -normal[1]];
      return <text key={side} className={side === figure.unknown ? styles.unknown : styles.label} x={midpoint[0] + normal[0] * 26} y={midpoint[1] + normal[1] * 26}>
        {side === figure.unknown ? 'x' : `${Math.sqrt(sideSquared(figure, side))} cm`}
      </text>;
    })}
  </svg>;
}
