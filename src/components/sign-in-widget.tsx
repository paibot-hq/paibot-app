"use client";

import { SignIn } from "@clerk/nextjs";
import type { ComponentProps } from "react";

// Keep SignIn on the same client import path as providers.tsx's ClerkProvider
// (both go through this one "use client" module). In vinext dev, importing
// SignIn directly from a Server Component page otherwise lets its deep
// "use client" hook files (client-boundary/hooks/useEnforceCatchAllRoute.js)
// resolve @clerk/shared/react through a separate module instance than the
// one ClerkProvider's context was created from, so useSession() inside
// SignIn can't see the provider even though it's mounted.
export default function SignInWidget(props: ComponentProps<typeof SignIn>) {
  return <SignIn {...props} />;
}
