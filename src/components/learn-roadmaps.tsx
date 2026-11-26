import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useLocale } from 'use-intl';
import { Link } from '../i18n/navigation';
import {
  LEARN_EDGES,
  LEARN_NODES,
  LEARN_ROADMAPS,
  pickText,
  traceGraph,
  type LearnNodeKind,
} from '../lib/learn-roadmaps';
import styles from './learn-roadmaps.module.css';

const STORAGE_KEY = 'paibot:learn-roadmap-done:v1';

const KIND_LABELS: Record<LearnNodeKind, { ja: string; en: string; zh: string }> = {
  math: { ja: '数学', en: 'Math', zh: '数学' },
  'ai-ds': { ja: 'AI・DS', en: 'AI & DS', zh: 'AI·DS' },
  lab: { ja: 'Lab 実験', en: 'Lab', zh: 'Lab 实验' },
};

const UI_TEXT = {
  heading: { ja: '知識のつながりマップ（ロードマップ）', en: 'Knowledge Dependency Map', zh: '知识依赖路线图' },
  lead: {
    ja: '単元を押すと、その場のメニューからすぐ受講できます。前提（上流）と応用先（下流）は矢印で光ります。',
    en: 'Press a topic to open its menu and start the lesson right there; arrows light its prerequisites and what it unlocks.',
    zh: '点击单元即可在原地打开菜单直接学习；箭头会高亮其前置与后续内容。',
  },
  progress: { ja: '理解済み', en: 'mastered', zh: '已掌握' },
  markDone: { ja: '理解済みにする', en: 'Mark mastered', zh: '标记为已掌握' },
  markedDone: { ja: '理解済み ✓', en: 'Mastered ✓', zh: '已掌握 ✓' },
  openLesson: { ja: '受講する →', en: 'Start lesson →', zh: '去学习 →' },
  close: { ja: '閉じる', en: 'Close', zh: '关闭' },
  legendSelected: { ja: '選択中', en: 'Selected', zh: '当前选中' },
  legendUp: { ja: '前提（先に学ぶ）', en: 'Prerequisites', zh: '前置知识' },
  legendDown: { ja: '応用先（次につながる）', en: 'Unlocks', zh: '后续应用' },
  legendDone: { ja: '理解済み', en: 'Mastered', zh: '已掌握' },
  prereqHeading: { ja: '前提になる知識', en: 'Direct Prerequisites', zh: '直接前置知识' },
  unlocksHeading: { ja: 'これが次に使われる先', en: 'Used Next In', zh: '后续直接应用于' },
  nonePrereq: { ja: 'このロードマップの出発点です。ここから始められます。', en: 'Starting point in this roadmap.', zh: '本路线图的起点，可直接开始学习。' },
  noneUnlocks: { ja: 'このロードマップのゴールです！', en: 'Final goal of this roadmap!', zh: '本路线图的最终目标！' },
  clearSelection: { ja: '全体表示に戻す', en: 'Show all', zh: '返回全图' },
  nextUp: { ja: '次に学ぶ', en: 'Up next', zh: '接下来学' },
  allDone: { ja: 'このロードマップは全部理解済みです 🎉', en: 'Every topic here is mastered 🎉', zh: '本路线图已全部掌握 🎉' },
  clickHint: {
    ja: '上のマップから気になる単元をクリックすると、その前提と応用先が矢印で光り、ここに詳細とレッスンへのリンクが表示されます。',
    en: 'Click any node in the map above to highlight its prerequisites and unlocked topics, and see details here.',
    zh: '点击上方地图中的任意节点，即可高亮其前置依赖与后续应用，并在此处查看详情和课程链接。',
  },
} as const;

const NODE_W = 204;
const NODE_H = 54;
const COL_GAP = 84;
const ROW_GAP = 16;
const PAD_X = 20;
const HEADER_H = 44;
const PAD_BOTTOM = 24;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default function LearnRoadmaps() {
  const locale = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramId = searchParams.get('roadmap');
  const activeId = paramId && LEARN_ROADMAPS.some(r => r.id === paramId) ? paramId : null;
  const roadmap = activeId ? (LEARN_ROADMAPS.find(r => r.id === activeId) ?? null) : null;

  const allNodeIds = useMemo(() => (roadmap ? roadmap.stages.flatMap(s => s.nodes) : []), [roadmap]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    setSelectedId(null);
  }, [activeId]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setDone(parsed.filter(x => typeof x === 'string'));
      }
    } catch {
      // Ignore storage errors.
    }
  }, []);

  function toggleNode(id: string) {
    setDone(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors.
      }
      return next;
    });
  }

  function selectRoadmap(id: string) {
    const next = new URLSearchParams(searchParams);
    if (activeId === id) {
      next.delete('roadmap');
    } else {
      next.set('roadmap', id);
    }
    setSearchParams(next, { replace: true, preventScrollReset: true });
  }

  const nodeSet = useMemo(() => new Set(allNodeIds), [allNodeIds]);
  const internalEdges = useMemo(
    () => LEARN_EDGES.filter(e => nodeSet.has(e.from) && nodeSet.has(e.to)),
    [nodeSet],
  );

  // Compute deterministic column-based SVG coordinates for each node
  const layout = useMemo(() => {
    if (!roadmap) return { width: 0, height: 0, positions: new Map<string, { x: number; y: number; col: number }>() };
    const maxRows = Math.max(...roadmap.stages.map(s => s.nodes.length), 1);
    const bodyHeight = maxRows * NODE_H + (maxRows - 1) * ROW_GAP;
    const width = PAD_X * 2 + roadmap.stages.length * NODE_W + Math.max(0, roadmap.stages.length - 1) * COL_GAP;
    const height = HEADER_H + bodyHeight + PAD_BOTTOM;

    const positions = new Map<string, { x: number; y: number; col: number }>();
    roadmap.stages.forEach((stage, col) => {
      const colH = stage.nodes.length * NODE_H + Math.max(0, stage.nodes.length - 1) * ROW_GAP;
      const startY = HEADER_H + (bodyHeight - colH) / 2;
      const x = PAD_X + col * (NODE_W + COL_GAP);
      stage.nodes.forEach((id, row) => {
        positions.set(id, { x, y: startY + row * (NODE_H + ROW_GAP), col });
      });
    });

    return { width, height, positions };
  }, [roadmap]);

  const activeFocus = selectedId && nodeSet.has(selectedId) ? selectedId : null;
  const trace = useMemo(
    () => (activeFocus ? traceGraph(activeFocus, internalEdges) : null),
    [activeFocus, internalEdges],
  );

  const selectedNode = activeFocus ? LEARN_NODES[activeFocus] : null;

  const doneCount = allNodeIds.filter(id => done.includes(id)).length;
  const pct = allNodeIds.length > 0 ? Math.round((doneCount / allNodeIds.length) * 100) : 0;
  // The first topic (in study order) not yet mastered: one click starts the learner there.
  const nextNode = useMemo(() => {
    const id = allNodeIds.find(candidate => !done.includes(candidate) && LEARN_NODES[candidate]);
    return id ? LEARN_NODES[id] : null;
  }, [allNodeIds, done]);

  // The menu answers at the node itself; Escape puts the map back.
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!activeFocus) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedId(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeFocus]);

  // Where the menu opens, as fractions of the drawing so it tracks the SVG's scaling;
  // flipped when the node sits against the drawing's right or bottom edge.
  const menuPos = useMemo(() => {
    if (!activeFocus) return null;
    const pos = layout.positions.get(activeFocus);
    if (!pos) return null;
    const flipX = pos.x + 260 > layout.width;
    const flipY = pos.y + NODE_H + 170 > layout.height;
    return {
      left: `${(((flipX ? pos.x + NODE_W : pos.x)) / layout.width) * 100}%`,
      top: `${(((flipY ? pos.y : pos.y + NODE_H)) / layout.height) * 100}%`,
      flipX,
      flipY,
    };
  }, [activeFocus, layout]);

  return (
    <section id="roadmap" className={styles.section} aria-labelledby="learn-roadmaps-heading">
      <div className={styles.header}>
        <h2 id="learn-roadmaps-heading">{pickText(UI_TEXT.heading, locale)}</h2>
        <p className={styles.lead}>{pickText(UI_TEXT.lead, locale)}</p>
      </div>

      <div className={styles.tabs} role="tablist" aria-label={pickText(UI_TEXT.heading, locale)}>
        {LEARN_ROADMAPS.map(rm => {
          const selected = rm.id === activeId;
          return (
            <button
              key={rm.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={styles.tab}
              data-active={selected || undefined}
              onClick={() => selectRoadmap(rm.id)}
            >
              <span className={styles.tabBadge}>{pickText(rm.badge, locale)}</span>
              <span className={styles.tabTitle}>{pickText(rm.title, locale)}</span>
            </button>
          );
        })}
      </div>

      {roadmap && <div className={styles.panel} role="tabpanel">
        <div className={styles.panelHead}>
          <div>
            <h3 className={styles.panelTitle}>{pickText(roadmap.title, locale)}</h3>
            <p className={styles.panelDesc}>{pickText(roadmap.description, locale)}</p>
          </div>
          <div className={styles.progressBox}>
            <span className={styles.progressText}>
              <strong>{doneCount}</strong> / {allNodeIds.length} {pickText(UI_TEXT.progress, locale)} ({pct}%)
            </span>
            <div className={styles.progressTrack} aria-hidden="true">
              <div className={styles.progressFill} style={{ width: `${pct}%` }} />
            </div>
            {nextNode ? (
              <Link href={nextNode.href} className={styles.nextUp}>
                <span>{pickText(UI_TEXT.nextUp, locale)}</span>
                <strong>{pickText(nextNode.title, locale)} →</strong>
              </Link>
            ) : (
              <span className={styles.allDone}>{pickText(UI_TEXT.allDone, locale)}</span>
            )}
          </div>
        </div>

        <div className={styles.legend} aria-hidden="true">
          <span><i className={styles.dotSelected} />{pickText(UI_TEXT.legendSelected, locale)}</span>
          <span><i className={styles.dotUp} />{pickText(UI_TEXT.legendUp, locale)}</span>
          <span><i className={styles.dotDown} />{pickText(UI_TEXT.legendDown, locale)}</span>
          <span><i className={styles.dotDone} />{pickText(UI_TEXT.legendDone, locale)}</span>
        </div>

        <div className={styles.graphWrap}>
          <div className={styles.graphInner}>
          <svg
            className={styles.graphSvg}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            width={layout.width}
            height={layout.height}
            role="img"
            aria-label={pickText(roadmap.title, locale)}
          >
            <defs>
              <marker id="rm-arrow-muted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" opacity="0.35" />
              </marker>
              <marker id="rm-arrow-up" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#60a5fa" />
              </marker>
              <marker id="rm-arrow-down" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#c084fc" />
              </marker>
            </defs>

            {/* Stage column labels */}
            {roadmap.stages.map((stage, col) => {
              const x = PAD_X + col * (NODE_W + COL_GAP) + NODE_W / 2;
              return (
                <text key={stage.id} x={x} y={24} textAnchor="middle" className={styles.stageLabel}>
                  {pickText(stage.title, locale)}
                </text>
              );
            })}

            {/* Dependency edges */}
            {internalEdges.map(edge => {
              const p1 = layout.positions.get(edge.from);
              const p2 = layout.positions.get(edge.to);
              if (!p1 || !p2) return null;

              const key = `${edge.from}->${edge.to}`;
              const isNeutral = trace === null;
              const isActive = trace ? trace.activeEdges.has(key) : false;
              const isDown = trace ? (edge.from === activeFocus || trace.descendants.has(edge.from)) : false;

              let d: string;
              if (p1.col === p2.col) {
                // Same-column vertical/curved link along right side
                const goingDown = p2.y > p1.y;
                const x = p1.x + NODE_W;
                const y1 = p1.y + NODE_H / 2;
                const y2 = p2.y + NODE_H / 2;
                const bend = goingDown ? 26 : 34;
                d = `M ${x} ${y1} C ${x + bend} ${y1}, ${x + bend} ${y2}, ${x} ${y2}`;
              } else {
                const x1 = p1.x + NODE_W;
                const y1 = p1.y + NODE_H / 2;
                const x2 = p2.x - 2;
                const y2 = p2.y + NODE_H / 2;
                const dx = Math.max(36, (x2 - x1) * 0.45);
                d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
              }

              const strokeClass = isNeutral
                ? styles.edgeNeutral
                : !isActive
                  ? styles.edgeDim
                  : isDown
                    ? styles.edgeDown
                    : styles.edgeUp;
              const marker = isNeutral || !isActive
                ? 'url(#rm-arrow-muted)'
                : isDown
                  ? 'url(#rm-arrow-down)'
                  : 'url(#rm-arrow-up)';

              return (
                <path
                  key={key}
                  d={d}
                  fill="none"
                  className={strokeClass}
                  markerEnd={marker}
                />
              );
            })}

            {/* Nodes */}
            {allNodeIds.map(id => {
              const node = LEARN_NODES[id];
              const pos = layout.positions.get(id);
              if (!node || !pos) return null;

              const isSelected = id === activeFocus;
              const isUp = trace ? trace.ancestors.has(id) : false;
              const isDown = trace ? trace.descendants.has(id) : false;
              const isDone = done.includes(id);

              const stateAttr = trace === null
                ? 'neutral'
                : isSelected
                  ? 'selected'
                  : isUp
                    ? 'up'
                    : isDown
                      ? 'down'
                      : 'dim';

              return (
                <g
                  key={id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className={styles.svgNode}
                  data-state={stateAttr}
                  data-done={isDone || undefined}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(prev => (prev === id ? null : id))}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedId(prev => (prev === id ? null : id));
                    }
                  }}
                >
                  <rect width={NODE_W} height={NODE_H} rx={12} className={styles.nodeRect} />
                  <text x={12} y={18} className={styles.nodeKind} data-kind={node.kind}>
                    {pickText(KIND_LABELS[node.kind], locale)}
                  </text>
                  {isDone && (
                    <text x={NODE_W - 12} y={19} textAnchor="end" className={styles.nodeCheck}>
                      ✓
                    </text>
                  )}
                  <text x={12} y={39} className={styles.nodeLabel}>
                    {truncate(pickText(node.title, locale), locale === 'en' ? 24 : 15)}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* The node's menu, right where it was pressed: the lesson one tap away. */}
          {selectedNode && menuPos && (
            <div
              ref={menuRef}
              className={styles.nodeMenu}
              data-flip-x={menuPos.flipX || undefined}
              data-flip-y={menuPos.flipY || undefined}
              style={{ left: menuPos.left, top: menuPos.top }}
              role="dialog"
              aria-label={pickText(selectedNode.title, locale)}
            >
              <div className={styles.menuHead}>
                <span className={styles.kindBadge} data-kind={selectedNode.kind}>
                  {pickText(KIND_LABELS[selectedNode.kind], locale)}
                </span>
                <button
                  type="button"
                  className={styles.menuClose}
                  aria-label={pickText(UI_TEXT.close, locale)}
                  onClick={() => setSelectedId(null)}
                >
                  ×
                </button>
              </div>
              <p className={styles.menuTitle}>{pickText(selectedNode.title, locale)}</p>
              <p className={styles.menuRole}>{pickText(selectedNode.role, locale)}</p>
              <Link href={selectedNode.href} className={styles.menuOpen}>
                {pickText(UI_TEXT.openLesson, locale)}
              </Link>
              <button
                type="button"
                className={styles.menuDone}
                aria-pressed={done.includes(selectedNode.id)}
                onClick={() => toggleNode(selectedNode.id)}
              >
                {pickText(done.includes(selectedNode.id) ? UI_TEXT.markedDone : UI_TEXT.markDone, locale)}
              </button>
            </div>
          )}
          </div>
        </div>
      </div>}
    </section>
  );
}
