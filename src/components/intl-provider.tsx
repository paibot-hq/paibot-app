"use client";

import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";

// Keep the provider on the same client import path as next-intl hooks.
// In vinext dev, a library RSC entry can otherwise load an unbundled
// use-intl context while consumers use Vite's prebundled copy.
export default function IntlProvider(props: ComponentProps<typeof NextIntlClientProvider>) {
  return <NextIntlClientProvider {...props} />;
}
