import type messages from "../../messages/ja.json";
import type { Locale as AppLocale } from "./routing";
declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof messages;
  }
}
