import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import Providers from "../../components/providers";
import IntlProvider from "../../components/intl-provider";
import Header from "../../components/header";
import { routing } from "../../i18n/routing";
import { siteOrigin, isIndexable } from "../../lib/seo";
import "../globals.css";

export const dynamic = "force-dynamic";
export const viewport: Viewport = { themeColor: "#0f1720" };
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: { default: "PAIBOT.app", template: "%s | PAIBOT.app" },
  robots: { index: isIndexable, follow: true },
};

export default async function LocaleLayout({ children, params }: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const messages = await getMessages({ locale });
  return (
    <html lang={locale}>
      <body>
        <IntlProvider locale={locale} messages={messages} timeZone="Asia/Tokyo">
          <Providers><Header />{children}</Providers>
        </IntlProvider>
      </body>
    </html>
  );
}
