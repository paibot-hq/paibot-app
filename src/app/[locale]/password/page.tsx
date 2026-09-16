import { getLocale, getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";
import PasswordGenerator from "../../../components/password-generator";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/password", `${t("passwordTitle")} | PAIBOT.app`, t("passwordDescription"));
}

export default function PasswordPage() {
  return <PasswordGenerator />;
}
