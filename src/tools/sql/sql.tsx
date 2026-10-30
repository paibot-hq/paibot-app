"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "use-intl";
import CodePlayground from "../../components/code-playground";
import { workerRunner } from "../../lib/code-runner";
import { EXAMPLES } from "./examples";
import { createSqlWorker } from "./worker.client";
import SampleTables from "./sample-tables";
import { sampleSql, type Locale } from "./sample";

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
        aside: <SampleTables locale={locale} />,
        hint: t("hint"),
      }]}
    />
  );
}
