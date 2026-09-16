"use client";

import { SignUp } from "@clerk/nextjs";
import type { ComponentProps } from "react";

// See sign-in-widget.tsx: keeps SignUp on the same client import path as
// providers.tsx's ClerkProvider to avoid a dual @clerk/shared module
// instance under vinext dev.
export default function SignUpWidget(props: ComponentProps<typeof SignUp>) {
  return <SignUp {...props} />;
}
