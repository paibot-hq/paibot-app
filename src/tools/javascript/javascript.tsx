"use client";

import { useMemo } from "react";
import { useTranslations } from "use-intl";
import CodePlayground from "../../components/code-playground";
import { jsRunner } from "../../lib/js-runner";
import { EXAMPLES } from "./examples";

export default function JavaScriptRunner() {
  const t = useTranslations("App.javascript");
  const runner = useMemo(() => jsRunner(), []);
  return (
    <CodePlayground
      title={t("title")}
      intro={t("intro")}
      language="JavaScript"
      storageKey="javascript"
      examples={EXAMPLES.map(example => ({ ...example, label: t(`examples.${example.id}`) }))}
      runner={runner}
      indent="  "
      opensBlock={/[{[(]$/}
      stdin
      hint={t("hint")}
    />
  );
}
