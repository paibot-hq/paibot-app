import ToolLayout from './tool-layout';
import type { CommerceDocument, LegalDocument } from '../content/legal';
import styles from './legal-page.module.css';

function Header({ updated, notice }: { updated: string; notice?: string }) {
  return <>
    <p className={styles.updated}>{updated}</p>
    {notice && <p className={styles.notice}>{notice}</p>}
  </>;
}

// Terms, privacy and similar documents: numbered sections of prose and lists.
export function LegalPage({ document }: { document: LegalDocument }) {
  return <ToolLayout title={document.title}>
    <article className={styles.document}>
      <Header updated={document.updated} notice={document.notice} />
      {document.sections.map(section => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          {section.items && <ul>{section.items.map(item => <li key={item}>{item}</li>)}</ul>}
        </section>
      ))}
    </article>
  </ToolLayout>;
}

// The Specified Commercial Transactions Act notice: a label/value table.
export function CommercePage({ document }: { document: CommerceDocument }) {
  return <ToolLayout title={document.title}>
    <article className={styles.document}>
      <Header updated={document.updated} notice={document.notice} />
      <dl className={styles.rows}>
        {document.rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  </ToolLayout>;
}
