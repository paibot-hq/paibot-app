import { getLocale, getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";
import TimingGame from "../../../components/timing-game";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/timing", `${t("timing.title")} | PAIBOT.app`, t("timing.description"));
}

export default function TimingPage() {
  return <TimingGame />;
}
