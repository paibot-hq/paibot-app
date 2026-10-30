"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "use-intl";
import CodePlayground from "../../components/code-playground";
import { workerRunner } from "../../lib/code-runner";
import { EXAMPLES } from "./examples";
import { createSqlWorker } from "./worker.client";
import { sampleSql, TABLES, type Locale } from "./sample";
import styles from "./sql.module.css";

export default function SqlRunner() {
  const t = useTranslations("App.sql");
  const locale = useLocale() as Locale;
  const runner = useMemo(() => {
    const setup = sampleSql(locale);
    return workerRunner(createSqlWorker, code => ({ code, setup }));
  }, [locale]);
  return (
    <CodePlayground
      title={t("title")}
      intro={t("intro")}
      storageKey="sql"
      languages={[{
        id: "sql",
        name: "SQLite",
        runner,
        examples: EXAMPLES.map(example => ({ ...example, label: t(`examples.${example.id}`) })),
        indent: "  ",
        opensBlock: /\($/,
        aside: (
          <details className={styles.tables} open>
            <summary>{t("tablesTitle")}</summary>
            <ul>
              {TABLES.map(table => (
                <li key={table.name}>
                  <code className={styles.table}>{table.name}</code> <span className={styles.note}>{t(`tables.${table.name}`)}</span>
                  <div className={styles.columns}>{table.columns.map(column => <code key={column}>{column}</code>)}</div>
                </li>
              ))}
            </ul>
          </details>
        ),
        hint: t("hint"),
      }]}
    />
  );
}
