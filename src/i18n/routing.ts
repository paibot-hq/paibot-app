import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ja", "en", "zh"],
  defaultLocale: "ja",
  localePrefix: "always",
  // Unprefixed URLs default to Japanese; explicit URLs always win.
  localeDetection: false,
  // Public pages declare alternates using the configured canonical origin.
  alternateLinks: false,
});
export type Locale = (typeof routing.locales)[number];
