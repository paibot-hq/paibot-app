import { getLocale, getTranslations } from "next-intl/server";
import Apps from "../../../components/apps";
import { publicMetadata } from "../../../lib/seo";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/apps", t("appsTitle"), t("description"));
}
export default function Page() {
  return <Apps year={new Date().getFullYear()} />;
}
