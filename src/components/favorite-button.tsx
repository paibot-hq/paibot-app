"use client";

import { useFetcher, useLocation } from "react-router";
import { SignInButton } from "@clerk/react-router";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}>
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 17l-5.2 2.8 1-5.9-4.3-4.2 5.9-.8z" />
    </svg>
  );
}

// Shared by the /apps grid (src/components/apps.tsx) and every tool page
// (via ToolLayout) - the write side always lives on routes/apps.tsx's
// action, so a submission from a tool page passes an explicit actionPath
// (`/${locale}/apps`); apps.tsx itself omits it (defaults to the current,
// same route).
export default function FavoriteButton({ slug, signedIn, favorited, addLabel, removeLabel, actionPath }: {
  slug: string;
  signedIn: boolean;
  favorited: boolean;
  addLabel: string;
  removeLabel: string;
  actionPath?: string;
}) {
  // Both hooks are called unconditionally (Rules of Hooks) even though only
  // one branch below ends up using each - signedIn can change client-side
  // (e.g. right after the sign-in modal below succeeds) without remounting
  // this component.
  const { pathname } = useLocation();
  const fetcher = useFetcher();

  // Signed out: clicking the (always-unfavorited) star opens Clerk's sign-in
  // modal instead of submitting to the action - the server action also
  // rejects unauthenticated writes on its own (see routes/apps.tsx), this is
  // just the better UX for the common case of clicking a star while signed out.
  if (!signedIn) {
    return (
      <SignInButton mode="modal" forceRedirectUrl={pathname}>
        <button type="button" className="favorite-button" aria-label={addLabel} data-slug={slug}>
          <StarIcon filled={false} />
        </button>
      </SignInButton>
    );
  }

  const pendingIntent = fetcher.formData?.get("intent");
  const isFavorited = pendingIntent ? pendingIntent === "add" : favorited;
  return (
    <fetcher.Form method="post" action={actionPath}>
      <input type="hidden" name="appSlug" value={slug} />
      <input type="hidden" name="intent" value={isFavorited ? "remove" : "add"} />
      <button
        type="submit"
        className="favorite-button"
        aria-pressed={isFavorited}
        aria-label={isFavorited ? removeLabel : addLabel}
        data-slug={slug}
      >
        <StarIcon filled={isFavorited} />
      </button>
    </fetcher.Form>
  );
}
