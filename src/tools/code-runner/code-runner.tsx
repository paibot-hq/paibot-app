"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "use-intl";
import CodePlayground, { type PlaygroundLanguage } from "../../components/code-playground";
import { workerRunner } from "../../lib/code-runner";
import { jsRunner } from "../../lib/js-runner";
import { EXAMPLES as JAVASCRIPT } from "./javascript-examples";
import { EXAMPLES as PYTHON } from "./python-examples";
import { EXAMPLES as TYPESCRIPT } from "./typescript-examples";
import { compiler } from "./typescript";
import { createPythonWorker } from "./worker.client";

// Python, JavaScript and TypeScript on one page, a tab each (SQL, with its sample tables, is a page of its own: /sql).
export default function CodeRunner() {
  const t = useTranslations("App.codeRunner");
  const locale = useLocale();
  const runners = useMemo(() => ({
    python: workerRunner(createPythonWorker, (code, stdin) => ({ code, stdin })),
    javascript: jsRunner(),
    typescript: jsRunner(compiler(locale)),
  }), [locale]);
  const languages: PlaygroundLanguage[] = [
    {
      id: "python", name: "Python", runner: runners.python, indent: "    ", opensBlock: /:$/, stdin: true, hint: t("hints.python"),
      examples: PYTHON.map(example => ({ ...example, label: t(`examples.python.${example.id}`) })),
    },
    {
      id: "javascript", name: "JavaScript", runner: runners.javascript, indent: "  ", opensBlock: /[{[(]$/, stdin: true, hint: t("hints.javascript"),
      examples: JAVASCRIPT.map(example => ({ ...example, label: t(`examples.javascript.${example.id}`) })),
    },
    {
      id: "typescript", name: "TypeScript", runner: runners.typescript, indent: "  ", opensBlock: /[{[(]$/, stdin: true, hint: t("hints.typescript"),
      examples: TYPESCRIPT.map(example => ({ ...example, label: t(`examples.typescript.${example.id}`) })),
    },
  ];
  return <CodePlayground title={t("title")} intro={t("intro")} storageKey="code-runner" languages={languages} />;
}
