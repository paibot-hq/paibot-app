import { useTranslations } from 'use-intl';
import { columnCalculation, worthDrawing, type Column } from '../lib/math-column';
import styles from './math-column.module.css';

// The written column calculation (筆算) of a single operation on whole numbers,
// drawn from the digit-by-digit model in lib/math-column.ts.
export default function MathColumn({ expression }: { expression: string }) {
  const t = useTranslations('App.math.quiz');
  if (!worthDrawing(expression)) return null;
  const column = columnCalculation(expression);
  if (!column) return null;
  return <figure className={styles.figure}>
    <figcaption>{t('columnMethod')}</figcaption>
    {column.kind === 'divide' ? <Division column={column} /> : <Vertical column={column} />}
  </figure>;
}

const OPERATOR = { add: '+', subtract: '−', multiply: '×' } as const;

function Vertical({ column }: { column: Exclude<Column, { kind: 'divide' }> }) {
  const columns = column.width + 1;
  const cell = (key: string, text: string, className?: string, row?: number, col?: number) => <span key={key} className={`${styles.cell} ${className ?? ''}`} style={{ gridRow: row, gridColumn: col }}>{text}</span>;
  const cells: React.ReactNode[] = [];
  let row = 1;
  // Marks above the top number: carries, or the digits changed by borrowing.
  const marks = column.kind === 'subtract' ? column.adjusted : column.kind === 'add' || column.kind === 'multiply' ? column.carries : [];
  if (marks.some(mark => mark)) { marks.forEach((mark, i) => mark && cells.push(cell(`m${i}`, mark, styles.mark, row, i + 2))); row++; }
  column.top.forEach((digit, i) => digit && cells.push(cell(`t${i}`, digit, column.kind === 'subtract' && column.adjusted[i] !== null ? styles.struck : undefined, row, i + 2)));
  row++;
  cells.push(cell('op', OPERATOR[column.kind], styles.operator, row, 1));
  column.bottom.forEach((digit, i) => cells.push(cell(`b${i}`, digit, styles.underlined, row, i + 2)));
  cells.push(<span key="rule0" className={styles.underlined} style={{ gridRow: row, gridColumn: 1 }} />);
  row++;
  if (column.kind === 'multiply' && column.partials.length) {
    column.partials.forEach((partial, p) => {
      const last = p === column.partials.length - 1;
      partial.forEach((digit, i) => (digit || last) && cells.push(cell(`p${p}-${i}`, digit, last ? styles.underlined : undefined, row, i + 2)));
      row++;
    });
  }
  column.result.forEach((digit, i) => digit && cells.push(cell(`r${i}`, digit, undefined, row, i + 2)));
  return <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${columns}, 1.5em)` }} aria-hidden="true">{cells}</div>;
}

function Division({ column }: { column: Extract<Column, { kind: 'divide' }> }) {
  const n = column.dividend.length;
  const cells: React.ReactNode[] = [];
  column.quotient.forEach((digit, i) => digit && cells.push(<span key={`q${i}`} className={styles.cell} style={{ gridRow: 1, gridColumn: i + 2 }}>{digit}</span>));
  cells.push(<span key="d" className={`${styles.cell} ${styles.divisor}`} style={{ gridRow: 2, gridColumn: 1 }}>{column.divisor}</span>);
  column.dividend.forEach((digit, i) => cells.push(<span key={`n${i}`} className={`${styles.cell} ${styles.dividend} ${i === 0 ? styles.bracket : ''}`} style={{ gridRow: 2, gridColumn: i + 2 }}>{digit}</span>));
  column.rows.forEach((row, r) => Array.from(row.text).forEach((digit, i) => cells.push(
    <span key={`r${r}-${i}`} className={`${styles.cell} ${row.rule ? styles.underlined : ''}`} style={{ gridRow: r + 3, gridColumn: row.end - row.text.length + i + 3 }}>{digit}</span>,
  )));
  return <div className={styles.grid} style={{ gridTemplateColumns: `auto repeat(${n}, 1.5em)` }} aria-hidden="true">{cells}</div>;
}
