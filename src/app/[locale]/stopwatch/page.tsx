import { getLocale, getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";
import Stopwatch from "../../../components/stopwatch";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/stopwatch", `${t("stopwatch.title")} | PAIBOT.app`, t("stopwatch.description"));
}

export default function StopwatchPage() {
  return <Stopwatch />;
}
