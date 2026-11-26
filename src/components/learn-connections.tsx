import { useLocale } from 'use-intl';
import { Link } from '../i18n/navigation';
import { connectionsFor, pickText, type LearnNodeKind } from '../lib/learn-roadmaps';
import styles from './learn-connections.module.css';

const KIND_LABELS: Record<LearnNodeKind, { ja: string; en: string; zh: string }> = {
  math: { ja: '数学', en: 'Math', zh: '数学' },
  'ai-ds': { ja: 'AI・DS', en: 'AI & DS', zh: 'AI·DS' },
  lab: { ja: 'Lab', en: 'Lab', zh: 'Lab' },
};

const LABELS = {
  heading: { ja: 'この単元のつながり', en: 'How This Connects', zh: '知识关联' },
  prerequisites: { ja: '前提になる知識', en: 'Prerequisites', zh: '前置知识' },
  leadsTo: { ja: 'これが次に使われる先', en: 'Used Next In', zh: '后续应用' },
  roadmaps: { ja: '含まれるロードマップ', en: 'Part of Roadmaps', zh: '所属路线图' },
} as const;

export default function LearnConnections({ nodeId }: { nodeId: string }) {
  const locale = useLocale();
  const { prerequisites, leadsTo, roadmaps } = connectionsFor(nodeId);
  if (prerequisites.length === 0 && leadsTo.length === 0 && roadmaps.length === 0) return null;

  return (
    <aside className={styles.box} aria-labelledby="learn-connections-heading">
      <div className={styles.head}>
        <h2 id="learn-connections-heading" className={styles.heading}>
          {pickText(LABELS.heading, locale)}
        </h2>
        {roadmaps.length > 0 && (
          <div className={styles.roadmapLinks} aria-label={pickText(LABELS.roadmaps, locale)}>
            {roadmaps.map(rm => (
              <Link key={rm.id} href={`/learn?roadmap=${rm.id}#roadmap`} className={styles.roadmapPill}>
                {pickText(rm.title, locale)} →
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className={styles.columns}>
        {prerequisites.length > 0 && (
          <div className={styles.group}>
            <h3 className={styles.groupTitle}>← {pickText(LABELS.prerequisites, locale)}</h3>
            <ul className={styles.list}>
              {prerequisites.map(({ node, why }) => (
                <li key={node.id}>
                  <Link href={node.href} className={styles.item}>
                    <span className={styles.itemTop}>
                      <span className={styles.badge} data-kind={node.kind}>{pickText(KIND_LABELS[node.kind], locale)}</span>
                      <span className={styles.itemTitle}>{pickText(node.title, locale)}</span>
                    </span>
                    <span className={styles.why}>{pickText(why, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {leadsTo.length > 0 && (
          <div className={styles.group}>
            <h3 className={styles.groupTitle}>{pickText(LABELS.leadsTo, locale)} →</h3>
            <ul className={styles.list}>
              {leadsTo.map(({ node, why }) => (
                <li key={node.id}>
                  <Link href={node.href} className={styles.item}>
                    <span className={styles.itemTop}>
                      <span className={styles.badge} data-kind={node.kind}>{pickText(KIND_LABELS[node.kind], locale)}</span>
                      <span className={styles.itemTitle}>{pickText(node.title, locale)}</span>
                    </span>
                    <span className={styles.why}>{pickText(why, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
