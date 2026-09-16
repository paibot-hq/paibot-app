import { getLocale, getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";
import DiceRoller from "../../../components/dice-roller";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/dice", `${t("diceTitle")} | PAIBOT.app`, t("diceDescription"));
}

export default function DicePage() {
  return <DiceRoller />;
}
