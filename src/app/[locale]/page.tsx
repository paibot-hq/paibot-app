import { getLocale, getTranslations } from "next-intl/server";
import Home from "../../components/home";
import { publicMetadata } from "../../lib/seo";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "", t("title"), t("description"));
}
export default function Page() {
  return <Home year={new Date().getFullYear()} />;
}
