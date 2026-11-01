import { useState } from "react";
import { useTranslations } from "use-intl";
import type { DynamicT } from "../../lib/apps";
import { sampleRows, TABLES, type Locale, type TableName } from "./sample";
import styles from "./sql.module.css";

// What is in the sample tables, every row, one table at a time, with what each column means under its name.
export default function SampleTables({ locale }: { locale: Locale }) {
  const t = useTranslations("App.sql");
  const dynamic = t as unknown as DynamicT;
  const [shown, setShown] = useState<TableName>("products");
  const table = TABLES.find(item => item.name === shown)!;
  const rows = sampleRows(locale)[shown];
  return (
    <section className={styles.tables} aria-label={t("tablesTitle")} data-sql="tables">
      <div className={styles.head}>
        <span className={styles.title}>{t("tablesTitle")}</span>
        <div className={styles.switch} role="group" aria-label={t("tablesTitle")}>
          {TABLES.map(item => (
            <button key={item.name} type="button" aria-pressed={item.name === shown} onClick={() => setShown(item.name)}>
              {item.name} <span className={styles.count}>{t(`tables.${item.name}`)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.scroll}>
        <table className={styles.data}>
          <thead>
            <tr>
              {table.columns.map(column => {
                const [name, type] = column.split(" ");
                return <th key={name} scope="col" title={type}><code>{name}</code><span>{dynamic(`columns.${shown}.${name}`)}</span></th>;
              })}
            </tr>
          </thead>
          <tbody>{rows.map(row => <tr key={row[0]}>{row.map((cell, i) => <td key={i} data-number={typeof cell === "number" || undefined}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className={styles.note}>{t("tablesNote")}</p>
    </section>
  );
}
