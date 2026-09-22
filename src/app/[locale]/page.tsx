import { getLocale, getTranslations } from "next-intl/server";
import Cover from "../../components/cover";
import { publicMetadata } from "../../lib/seo";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "", t("title"), t("description"));
}
export default function Page() {
  return <Cover year={new Date().getFullYear()} />;
}
