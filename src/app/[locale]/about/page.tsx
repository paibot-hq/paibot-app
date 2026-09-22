import { getLocale, getTranslations } from "next-intl/server";
import About from "../../../components/about";
import { publicMetadata } from "../../../lib/seo";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/about", t("aboutTitle"), t("aboutBody"));
}
export default function Page() {
  return <About year={new Date().getFullYear()} />;
}
