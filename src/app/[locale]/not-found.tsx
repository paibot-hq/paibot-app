import { getTranslations } from "next-intl/server";
import { Link } from "../../i18n/navigation";
export default async function NotFound() {
  const t = await getTranslations("App");
  return <main className="section"><h1>404</h1><p>{t("notFound")}</p><Link href="/">{t("backHome")}</Link></main>;
}
