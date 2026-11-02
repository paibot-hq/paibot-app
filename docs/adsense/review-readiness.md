# AdSense review preparation

This change does not guarantee approval and does not submit a review.

- Home explains the site's purpose and offers four practical starting tasks.
- Six tools have worked examples with expected results and limits: character count,
  date calculation, SQL, JSON, metadata and photo redaction. Copy is localized in
  Japanese, English and Chinese. Photo redaction no longer promises that mosaic or
  blur prevents reconstruction or inference.
- About explains local vs external processing, incident sources, AI-assisted maths
  and how to request a correction. The existing support address is linked from
  the footer and tool descriptions.
- Empty maths sets are noindex and cannot be started from an item's primary button.
  Test pages have one noindex directive, rather than conflicting root and leaf tags.
- Production keeps `ads.txt` and emits `google-adsense-account` in the server-rendered
  head. The global Auto ads script is removed while awaiting approval, including
  across client-side navigation. This is verification, not ad serving. Enabling
  ads after approval needs a separate placement decision; ads will not automatically
  start serving after this change.

Google supports verification using a meta tag or ads.txt as well as an ad script:
https://support.google.com/adsense/answer/7584263

After the production release, check the new page content, the verification meta tag
and `/ads.txt` on paibot.app. If the AdSense console still has the code-snippet method
selected, select the meta-tag or ads.txt method and verify it before requesting a
review. The AdSense account UI and review submission are not changed by this PR.

Follow the existing production workflow after the development checks pass. Merging
this change alone does not deploy it to production. Do not bypass the development
release gate using the rollback ref input.
