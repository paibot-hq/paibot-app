"use client";

import { useMemo } from "react";
import { useTranslations } from "use-intl";
import CodePlayground from "../../components/code-playground";
import { workerRunner } from "../../lib/code-runner";
import { EXAMPLES } from "./examples";
import { createPythonWorker } from "./worker.client";

export default function PythonRunner() {
  const t = useTranslations("App.python");
  const runner = useMemo(() => workerRunner(createPythonWorker, (code, stdin) => ({ code, stdin })), []);
  return (
    <CodePlayground
      title={t("title")}
      intro={t("intro")}
      language="Python"
      storageKey="python"
      examples={EXAMPLES.map(example => ({ ...example, label: t(`examples.${example.id}`) }))}
      runner={runner}
      indent="    "
      opensBlock={/:$/}
      stdin
      hint={t("hint")}
    />
  );
}
